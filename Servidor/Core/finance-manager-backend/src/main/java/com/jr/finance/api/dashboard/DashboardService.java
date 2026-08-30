package com.jr.finance.api.dashboard;

import com.jr.finance.api.alerts.AlertService;
import com.jr.finance.api.common.BalanceService;
import com.jr.finance.api.dashboard.dto.DashboardMonthResponse;
import com.jr.finance.api.dashboard.dto.SavingProgressResponse;
import com.jr.finance.api.dashboard.dto.TopCategoryResponse;
import com.jr.finance.api.expense.ExpenseService;
import com.jr.finance.api.saving.SavingService;
import com.jr.finance.api.account.AccountRepository;
import com.jr.finance.api.budget.BudgetService;
import com.jr.finance.api.budget.BudgetStatus;
import com.jr.finance.api.dashboard.dto.DashboardAccountResponse;
import com.jr.finance.api.dashboard.dto.DashboardBudgetSummary;
import com.jr.finance.api.dashboard.dto.DashboardCreditResponse;
import com.jr.finance.api.credit.CreditRepository;
import com.jr.finance.api.credit.CreditSnapshotService;
import com.jr.finance.api.dashboard.dto.DashboardRecentTransactionResponse;
import com.jr.finance.api.ledger.FinancialTransaction;
import com.jr.finance.api.ledger.FinancialTransactionRepository;
import com.jr.finance.api.ledger.FinancialTransactionType;
import com.jr.finance.api.ledger.LedgerEntry;
import com.jr.finance.api.ledger.LedgerEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final int RECENT_TRANSACTIONS_LIMIT = 5;

    private final ExpenseService expenseService;
    private final BalanceService balanceService;
    private final SavingService savingService;
    private final AlertService alertService;
    private final AccountRepository accountRepository;
    private final BudgetService budgetService;
    private final CreditRepository creditRepository;
    private final CreditSnapshotService creditSnapshotService;
    private final FinancialTransactionRepository transactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;

    public DashboardMonthResponse getMonthDashboard(Long userId, int year, int month) {

        log.info("Generando dashboard del usuario {} para {}/{}.",
                userId,
                month,
                year);

        var summary = expenseService.monthlySummary(userId, year, month);
        var balanceResponse = balanceService.monthlyBalance(userId, year, month);
        var comparison = expenseService.compareMonth(userId, year, month);

        // Totales rápidos
        BigDecimal totalExpense = summary.getTotal();
        BigDecimal totalIncome = balanceResponse.getTotalIncome();
        BigDecimal balance = balanceResponse.getBalance();

        // Top 3 categorías
        List<TopCategoryResponse> topCategories = summary.getTotalByCategory()
                .entrySet()
                .stream()
                .map(entry -> new TopCategoryResponse(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparing(TopCategoryResponse::getTotal).reversed())
                .limit(3)
                .collect(Collectors.toList());

        // Metas de ahorro
        List<SavingProgressResponse> savings = savingService.listGoals(userId)
                .stream()
                .map(goal -> new SavingProgressResponse(
                        goal.getId(),
                        goal.getName(),
                        goal.getTargetAmount(),
                        goal.getCurrentAmount(),
                        savingService.progressPercentage(goal),
                        goal.isCompleted()
                ))
                .toList();

        List<DashboardAccountResponse> accounts = accountRepository.findDashboardBalancesByUserId(userId).stream()
                .map(row -> new DashboardAccountResponse((Long) row[0], (String) row[1],
                        (com.jr.finance.api.account.AccountType) row[2], (String) row[3], (Boolean) row[4], (BigDecimal) row[5])).toList();
        var assetsByCurrency = accounts.stream().collect(Collectors.groupingBy(DashboardAccountResponse::getCurrency,
                Collectors.reducing(BigDecimal.ZERO, DashboardAccountResponse::getBalance, BigDecimal::add)));
        var budgetItems = budgetService.list(userId, year, month);
        var alerts = alertService.buildAlerts(userId, year, month, false, budgetItems);
        BigDecimal budgeted = budgetItems.stream().map(com.jr.finance.api.budget.dto.BudgetResponse::getLimitAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal budgetSpent = budgetItems.stream().map(com.jr.finance.api.budget.dto.BudgetResponse::getSpentAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        var budgets = new DashboardBudgetSummary(budgetItems, budgeted, budgetSpent, budgeted.subtract(budgetSpent),
                budgeted.signum() == 0 ? BigDecimal.ZERO : budgetSpent.multiply(BigDecimal.valueOf(100)).divide(budgeted, 2, java.math.RoundingMode.HALF_UP),
                budgetItems.stream().filter(b -> b.getStatus() == BudgetStatus.WARNING).count(),
                budgetItems.stream().filter(b -> b.getStatus() == BudgetStatus.EXCEEDED).count());
        List<DashboardCreditResponse> credits = creditRepository.findByUserIdOrderByCreatedAtAscIdAsc(userId).stream()
                .map(credit -> { var snapshot = creditSnapshotService.snapshot(credit);
                    return new DashboardCreditResponse(credit.getId(), credit.getName(), credit.getPrincipal(),
                        credit.getAnnualRate(), credit.getTermMonths(), credit.getDisbursementDate(), credit.getPaymentDay(),
                        snapshot.remainingBalance(), snapshot.status(), snapshot.nextPaymentDate()); })
                .toList();
        var liabilitiesByCurrency = creditRepository.findByUserId(userId).stream()
                .map(credit -> java.util.Map.entry(credit.getCurrency(), creditSnapshotService.snapshot(credit).remainingBalance()))
                .collect(Collectors.groupingBy(java.util.Map.Entry::getKey,
                        Collectors.reducing(BigDecimal.ZERO, java.util.Map.Entry::getValue, BigDecimal::add)));
        var netWorthByCurrency = new java.util.TreeMap<String, BigDecimal>();
        assetsByCurrency.forEach((currency, value) -> netWorthByCurrency.put(currency, value.subtract(liabilitiesByCurrency.getOrDefault(currency, BigDecimal.ZERO))));
        liabilitiesByCurrency.forEach((currency, value) -> netWorthByCurrency.putIfAbsent(currency, value.negate()));
        List<DashboardRecentTransactionResponse> recentTransactions = recentTransactions(userId, year, month);

        log.info("Dashboard generado correctamente para el usuario {}.", userId);

        return new DashboardMonthResponse(
                totalIncome,
                totalExpense,
                balance,
                balance,
                netWorthByCurrency, assetsByCurrency, liabilitiesByCurrency,
                accounts,
                budgets,
                summary,
                comparison,
                savings,
                topCategories,
                alerts,
                credits,
                recentTransactions,
                null
        );
    }

    private List<DashboardRecentTransactionResponse> recentTransactions(Long userId, int year, int month) {
        YearMonth period = YearMonth.of(year, month);
        List<Long> ids = transactionRepository.findRecentIdsByUserAndPeriod(userId, period.atDay(1),
                period.atEndOfMonth(), PageRequest.of(0, RECENT_TRANSACTIONS_LIMIT));
        if (ids.isEmpty()) {
            return List.of();
        }

        Map<Long, FinancialTransaction> transactions = transactionRepository
                .findDashboardTransactionsByUserIdAndIdIn(userId, ids).stream()
                .collect(Collectors.toMap(FinancialTransaction::getId, transaction -> transaction));
        Map<Long, List<LedgerEntry>> entriesByTransaction = ledgerEntryRepository
                .findByFinancialTransactionIdInWithAccount(ids).stream()
                .collect(Collectors.groupingBy(entry -> entry.getFinancialTransaction().getId()));

        return ids.stream().map(id -> recentTransaction(transactions.get(id),
                entriesByTransaction.getOrDefault(id, List.of()))).toList();
    }

    private DashboardRecentTransactionResponse recentTransaction(FinancialTransaction transaction,
                                                                 List<LedgerEntry> entries) {
        List<LedgerEntry> sortedEntries = new ArrayList<>(entries);
        sortedEntries.sort(Comparator.comparing(entry -> entry.getAccount().getId()));
        LedgerEntry negative = sortedEntries.stream().filter(entry -> entry.getSignedAmount().signum() < 0)
                .findFirst().orElse(null);
        LedgerEntry positive = sortedEntries.stream().filter(entry -> entry.getSignedAmount().signum() > 0)
                .findFirst().orElse(null);
        boolean transferLike = transaction.getType() == FinancialTransactionType.TRANSFER
                || (transaction.getType() == FinancialTransactionType.REVERSAL
                && transaction.getReversalOf() != null
                && transaction.getReversalOf().getType() == FinancialTransactionType.TRANSFER);
        LedgerEntry accountEntry = sortedEntries.isEmpty() ? null : sortedEntries.getFirst();
        BigDecimal amount = accountEntry == null ? BigDecimal.ZERO
                : transaction.getType() == FinancialTransactionType.OPENING_BALANCE
                ? accountEntry.getSignedAmount() : accountEntry.getSignedAmount().abs();

        return new DashboardRecentTransactionResponse(transaction.getId(), transaction.getType().name(),
                transaction.getStatus().name(), transaction.getEffectiveDate(), transaction.getDescription(), amount,
                transaction.getCurrency(), transaction.getCategory() == null ? null : transaction.getCategory().getId(),
                transaction.getCategory() == null ? null : transaction.getCategory().getName(),
                transferLike || accountEntry == null ? null : accountEntry.getAccount().getId(),
                transferLike || accountEntry == null ? null : accountEntry.getAccount().getName(),
                transferLike && negative != null ? negative.getAccount().getId() : null,
                transferLike && negative != null ? negative.getAccount().getName() : null,
                transferLike && positive != null ? positive.getAccount().getId() : null,
                transferLike && positive != null ? positive.getAccount().getName() : null,
                transaction.getReversalOf() == null ? null : transaction.getReversalOf().getId());
    }
}
