package com.jr.finance.api.budget;

import com.jr.finance.api.budget.dto.BudgetResponse;
import com.jr.finance.api.budget.dto.CreateBudgetRequest;
import com.jr.finance.api.budget.dto.UpdateBudgetRequest;
import com.jr.finance.api.common.FinancialPeriod;
import com.jr.finance.api.common.exception.ConflictException;
import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.expense.CategoryRepository;
import com.jr.finance.api.ledger.FinancialTransactionStatus;
import com.jr.finance.api.ledger.FinancialTransactionType;
import com.jr.finance.api.ledger.LedgerEntryRepository;
import com.jr.finance.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BudgetService {

    static final BigDecimal WARNING_PERCENTAGE = new BigDecimal("80");
    private static final int PERCENTAGE_SCALE = 2;

    private final BudgetRepository budgetRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final LedgerEntryRepository ledgerEntryRepository;

    @Transactional
    public BudgetResponse create(Long userId, CreateBudgetRequest request) {
        YearMonth period = FinancialPeriod.of(request.getYear(), request.getMonth());
        var category = categoryRepository.findByIdAndUserId(request.getCategoryId(), userId)
                .orElseThrow(() -> new NotFoundException("La categoría no existe"));
        if (budgetRepository.existsByUserIdAndCategoryIdAndYearAndMonth(userId, category.getId(),
                period.getYear(), period.getMonthValue())) {
            throw new ConflictException("Ya existe un presupuesto para esa categoría y período");
        }
        Budget budget = new Budget();
        budget.setUser(userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("El usuario no existe")));
        budget.setCategory(category);
        budget.setYear(period.getYear());
        budget.setMonth(period.getMonthValue());
        budget.setLimitAmount(request.getLimitAmount());
        try {
            return response(budgetRepository.saveAndFlush(budget));
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException("Ya existe un presupuesto para esa categoría y período");
        }
    }

    @Transactional(readOnly = true)
    public List<BudgetResponse> list(Long userId, Integer year, Integer month) {
        if ((year == null) != (month == null)) {
            throw new com.jr.finance.api.common.exception.BadRequestException("Año y mes deben enviarse juntos");
        }
        List<Budget> budgets;
        if (year == null) {
            budgets = budgetRepository.findByUserIdOrderByYearDescMonthDescCategoryNameAsc(userId);
        } else {
            YearMonth period = FinancialPeriod.of(year, month);
            budgets = budgetRepository.findByUserIdAndYearAndMonthOrderByCategoryNameAsc(userId,
                    period.getYear(), period.getMonthValue());
        }
        if (year == null) {
            return budgets.stream().map(this::response).toList();
        }
        Map<Long, BigDecimal> spentByCategory = spentByCategory(userId, FinancialPeriod.of(year, month));
        return budgets.stream().map(budget -> response(budget,
                spentByCategory.getOrDefault(budget.getCategory().getId(), BigDecimal.ZERO))).toList();
    }

    public BudgetResponse get(Long userId, Long budgetId) {
        return response(owned(userId, budgetId));
    }

    @Transactional
    public BudgetResponse update(Long userId, Long budgetId, UpdateBudgetRequest request) {
        Budget budget = owned(userId, budgetId);
        if (!budget.getVersion().equals(request.getVersion())) {
            throw new ConflictException("El presupuesto fue modificado por otra operación. Intenta nuevamente.");
        }
        budget.setLimitAmount(request.getLimitAmount());
        return response(budgetRepository.saveAndFlush(budget));
    }

    private Budget owned(Long userId, Long budgetId) {
        return budgetRepository.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new NotFoundException("El presupuesto no existe"));
    }

    private BudgetResponse response(Budget budget) {
        YearMonth period = YearMonth.of(budget.getYear(), budget.getMonth());
        BigDecimal spent = spentByCategory(budget.getUser().getId(), period)
                .getOrDefault(budget.getCategory().getId(), BigDecimal.ZERO);
        return response(budget, spent);
    }

    private Map<Long, BigDecimal> spentByCategory(Long userId, YearMonth period) {
        return ledgerEntryRepository.sumSpentByCategoryForUserAndPeriod(userId, period.atDay(1),
                        period.atEndOfMonth(), FinancialTransactionType.EXPENSE,
                        FinancialTransactionType.REVERSAL, FinancialTransactionStatus.VOIDED)
                .stream()
                .collect(Collectors.toMap(com.jr.finance.api.budget.dto.BudgetCategorySpent::getCategoryId,
                        com.jr.finance.api.budget.dto.BudgetCategorySpent::getSpentAmount));
    }

    private BudgetResponse response(Budget budget, BigDecimal spent) {
        YearMonth period = YearMonth.of(budget.getYear(), budget.getMonth());
        BigDecimal remaining = budget.getLimitAmount().subtract(spent);
        BigDecimal percentage = spent.multiply(BigDecimal.valueOf(100))
                .divide(budget.getLimitAmount(), PERCENTAGE_SCALE, RoundingMode.HALF_UP);
        BudgetStatus status = percentage.compareTo(BigDecimal.valueOf(100)) > 0 ? BudgetStatus.EXCEEDED
                : percentage.compareTo(WARNING_PERCENTAGE) >= 0 ? BudgetStatus.WARNING : BudgetStatus.OK;
        return new BudgetResponse(budget.getId(), budget.getCategory().getId(), budget.getCategory().getName(),
                budget.getYear(), budget.getMonth(), period.toString(), budget.getLimitAmount(), spent,
                remaining, percentage, status, budget.getVersion());
    }
}
