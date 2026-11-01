package com.jr.finance.api.reports;

import com.jr.finance.api.budget.BudgetRepository;
import com.jr.finance.api.common.FinancialPeriod;
import com.jr.finance.api.expense.Category;
import com.jr.finance.api.expense.CategoryRepository;
import com.jr.finance.api.expense.CategoryType;
import com.jr.finance.api.ledger.FinancialTransactionStatus;
import com.jr.finance.api.ledger.FinancialTransactionType;
import com.jr.finance.api.ledger.LedgerEntryRepository;
import com.jr.finance.api.reports.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryReportService {
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final LedgerEntryRepository entries;
    private final CategoryRepository categories;
    private final BudgetRepository budgets;

    @Transactional(readOnly = true)
    public CategoryReportResponse categories(Long userId, int year, int month, String currency, CategoryType type) {
        var period = FinancialPeriod.of(year, month);
        var transactionType = type == CategoryType.INCOME
                ? FinancialTransactionType.INCOME : FinancialTransactionType.EXPENSE;
        var movements = entries.findByUserTypeAndPeriod(userId, transactionType, FinancialTransactionType.REVERSAL,
                period.atDay(1), period.atEndOfMonth(), FinancialTransactionStatus.VOIDED);
        Map<Long, CategoryGroupAccumulator> groups = new TreeMap<>();
        var userCategories = categories.findByUserIdAndTypeOrderByNameAsc(userId, type);
        for (Category category : userCategories) {
            if (category.getParentCategory() == null) {
                groups.computeIfAbsent(category.getId(), ignored -> new CategoryGroupAccumulator(category));
            }
        }
        BigDecimal total = ZERO;
        BigDecimal noCategoryAmount = ZERO;
        for (var entry : movements) {
            var transaction = entry.getFinancialTransaction();
            if (!currency.equals(transaction.getCurrency())) continue;
            BigDecimal amount = type == CategoryType.INCOME ? entry.getSignedAmount() : entry.getSignedAmount().negate();
            total = total.add(amount);
            Category category = transaction.getType() == FinancialTransactionType.REVERSAL
                    && transaction.getReversalOf() != null
                    ? transaction.getReversalOf().getCategory() : transaction.getCategory();
            if (category == null) {
                noCategoryAmount = noCategoryAmount.add(amount);
                continue;
            }
            Category root = category.getParentCategory() == null ? category : category.getParentCategory();
            CategoryGroupAccumulator group = groups.computeIfAbsent(root.getId(), ignored -> new CategoryGroupAccumulator(root));
            group.add(category, amount);
        }
        List<CategoryReportGroup> result = groups.values().stream().map(CategoryGroupAccumulator::toResponse)
                .filter(item -> item.amount().signum() != 0 || item.directAmount().signum() != 0
                        || !item.subcategories().isEmpty())
                .sorted(Comparator.comparing(CategoryReportGroup::categoryName, String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toCollection(ArrayList::new));
        if (noCategoryAmount.signum() != 0) {
            result.add(new CategoryReportGroup(null, "Sin categoría", noCategoryAmount, noCategoryAmount, List.of()));
        }
        return new CategoryReportResponse(year, month, currency, type, total, List.copyOf(result));
    }

    @Transactional(readOnly = true)
    public BudgetComparisonResponse budgetVsActual(Long userId, int year, int month) {
        var period = FinancialPeriod.of(year, month);
        var movementRows = entries.findByUserTypeAndPeriod(userId, FinancialTransactionType.EXPENSE,
                FinancialTransactionType.REVERSAL, period.atDay(1), period.atEndOfMonth(),
                FinancialTransactionStatus.VOIDED);
        Map<Long, BigDecimal> spentByCategory = new HashMap<>();
        BigDecimal uncategorizedSpent = ZERO;
        BigDecimal totalSpent = ZERO;
        for (var entry : movementRows) {
            if (!"COP".equals(entry.getFinancialTransaction().getCurrency())) continue;
            BigDecimal amount = entry.getSignedAmount().negate();
            totalSpent = totalSpent.add(amount);
            Category category = entry.getFinancialTransaction().getType() == FinancialTransactionType.REVERSAL
                    && entry.getFinancialTransaction().getReversalOf() != null
                    ? entry.getFinancialTransaction().getReversalOf().getCategory()
                    : entry.getFinancialTransaction().getCategory();
            if (category == null) uncategorizedSpent = uncategorizedSpent.add(amount);
            else spentByCategory.merge(category.getId(), amount, BigDecimal::add);
        }

        var allCategories = categories.findByUserIdAndTypeOrderByNameAsc(userId, CategoryType.EXPENSE);
        Map<Long, com.jr.finance.api.budget.Budget> budgetByCategory = budgets
                .findByUserIdAndYearAndMonthOrderByCategoryNameAsc(userId, year, month).stream()
                .filter(com.jr.finance.api.budget.Budget::isActive)
                .collect(Collectors.toMap(item -> item.getCategory().getId(), item -> item));
        Map<Long, List<Category>> children = allCategories.stream().filter(item -> item.getParentCategory() != null)
                .collect(Collectors.groupingBy(item -> item.getParentCategory().getId()));
        var roots = allCategories.stream().filter(item -> item.getParentCategory() == null)
                .sorted(Comparator.comparing(Category::getName, String.CASE_INSENSITIVE_ORDER)).toList();

        List<BudgetComparisonGroup> groupRows = new ArrayList<>();
        List<UnbudgetedCategoryAmount> unbudgeted = new ArrayList<>();
        BigDecimal totalBudgeted = ZERO;
        BigDecimal totalSpentOnBudgeted = ZERO;
        BigDecimal totalUnbudgeted = uncategorizedSpent;
        if (uncategorizedSpent.signum() != 0) {
            unbudgeted.add(new UnbudgetedCategoryAmount(null, "Sin categoría", null, uncategorizedSpent));
        }

        for (Category root : roots) {
            List<Category> subcategories = children.getOrDefault(root.getId(), List.of()).stream()
                    .sorted(Comparator.comparing(Category::getName, String.CASE_INSENSITIVE_ORDER)).toList();
            var parentBudget = budgetByCategory.get(root.getId());
            BigDecimal directSpent = spentByCategory.getOrDefault(root.getId(), ZERO);
            BigDecimal subtreeSpent = directSpent.add(subcategories.stream()
                    .map(item -> spentByCategory.getOrDefault(item.getId(), ZERO))
                    .reduce(ZERO, BigDecimal::add));
            boolean hasParentBudget = parentBudget != null;
            BigDecimal groupLimit = hasParentBudget ? parentBudget.getLimitAmount()
                    : subcategories.stream().map(item -> budgetByCategory.get(item.getId()))
                    .filter(Objects::nonNull).map(com.jr.finance.api.budget.Budget::getLimitAmount)
                    .reduce(ZERO, BigDecimal::add);
            boolean hasBudget = hasParentBudget || subcategories.stream().anyMatch(item -> budgetByCategory.containsKey(item.getId()));
            BigDecimal budgetedSpent = hasParentBudget ? subtreeSpent : subcategories.stream()
                    .filter(item -> budgetByCategory.containsKey(item.getId()))
                    .map(item -> spentByCategory.getOrDefault(item.getId(), ZERO)).reduce(ZERO, BigDecimal::add);
            List<BudgetComparisonItem> subcategoryRows = new ArrayList<>();

            if (!hasParentBudget && directSpent.signum() != 0) {
                unbudgeted.add(new UnbudgetedCategoryAmount(root.getId(), root.getName(), null, directSpent));
                totalUnbudgeted = totalUnbudgeted.add(directSpent);
            }
            for (Category child : subcategories) {
                var childBudget = budgetByCategory.get(child.getId());
                BigDecimal childSpent = spentByCategory.getOrDefault(child.getId(), ZERO);
                boolean coveredByParent = hasParentBudget && childBudget == null;
                BigDecimal childLimit = childBudget == null ? ZERO : childBudget.getLimitAmount();
                subcategoryRows.add(comparisonItem(child.getId(), child.getName(), childLimit, childSpent,
                        childBudget != null, coveredByParent));
                if (!hasParentBudget && childBudget == null && childSpent.signum() != 0) {
                    unbudgeted.add(new UnbudgetedCategoryAmount(child.getId(), child.getName(), root.getName(), childSpent));
                    totalUnbudgeted = totalUnbudgeted.add(childSpent);
                }
            }
            if (hasBudget) {
                totalBudgeted = totalBudgeted.add(groupLimit);
                totalSpentOnBudgeted = totalSpentOnBudgeted.add(budgetedSpent);
            }
            if (hasBudget || subtreeSpent.signum() != 0) {
                groupRows.add(new BudgetComparisonGroup(root.getId(), root.getName(), groupLimit, subtreeSpent,
                        budgetedSpent, groupLimit.subtract(budgetedSpent), percentage(budgetedSpent, groupLimit),
                        positive(groupLimit.subtract(budgetedSpent)), positive(budgetedSpent.subtract(groupLimit)),
                        hasBudget, hasParentBudget, directSpent, List.copyOf(subcategoryRows)));
            }
        }
        return new BudgetComparisonResponse(year, month, "COP", totalBudgeted, totalSpent,
                totalSpentOnBudgeted, totalUnbudgeted, List.copyOf(groupRows), List.copyOf(unbudgeted));
    }

    private static BudgetComparisonItem comparisonItem(Long id, String name, BigDecimal limit,
                                                       BigDecimal spent, boolean hasBudget, boolean coveredByParent) {
        BigDecimal difference = hasBudget ? limit.subtract(spent) : ZERO;
        return new BudgetComparisonItem(id, name, limit, spent, difference,
                hasBudget ? percentage(spent, limit) : null, positive(difference),
                hasBudget ? positive(spent.subtract(limit)) : ZERO, hasBudget, coveredByParent);
    }

    private static BigDecimal percentage(BigDecimal spent, BigDecimal limit) {
        return limit.signum() == 0 ? null : spent.multiply(HUNDRED).divide(limit, 2, RoundingMode.HALF_UP);
    }

    private static BigDecimal positive(BigDecimal value) {
        return value.signum() > 0 ? value : ZERO;
    }

    private static final class CategoryGroupAccumulator {
        private final Long id;
        private final String name;
        private BigDecimal amount = ZERO;
        private BigDecimal directAmount = ZERO;
        private final Map<Long, CategoryReportItemAccumulator> children = new TreeMap<>();

        private CategoryGroupAccumulator(Category root) {
            id = root.getId();
            name = root.getName();
        }

        private void add(Category category, BigDecimal value) {
            amount = amount.add(value);
            if (category.getId().equals(id)) directAmount = directAmount.add(value);
            else children.computeIfAbsent(category.getId(), ignored -> new CategoryReportItemAccumulator(category)).add(value);
        }

        private CategoryReportGroup toResponse() {
            return new CategoryReportGroup(id, name, amount, directAmount,
                    children.values().stream().map(CategoryReportItemAccumulator::toResponse).toList());
        }
    }

    private static final class CategoryReportItemAccumulator {
        private final Long id;
        private final String name;
        private BigDecimal amount = ZERO;
        private CategoryReportItemAccumulator(Category category) { id = category.getId(); name = category.getName(); }
        private void add(BigDecimal value) { amount = amount.add(value); }
        private CategoryReportItem toResponse() { return new CategoryReportItem(id, name, amount); }
    }
}
