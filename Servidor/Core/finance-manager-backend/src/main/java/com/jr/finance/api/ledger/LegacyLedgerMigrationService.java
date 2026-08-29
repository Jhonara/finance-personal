package com.jr.finance.api.ledger;

import com.jr.finance.api.account.Account;
import com.jr.finance.api.account.AccountRepository;
import com.jr.finance.api.account.AccountType;
import com.jr.finance.api.expense.Expense;
import com.jr.finance.api.expense.ExpenseRepository;
import com.jr.finance.api.income.Income;
import com.jr.finance.api.income.IncomeRepository;
import com.jr.finance.api.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.util.List;

/** Explicit, batch-oriented legacy migration. It is never invoked by normal application flows. */
@Service
@RequiredArgsConstructor
public class LegacyLedgerMigrationService {
    private static final int DEFAULT_BATCH_SIZE = 500;
    private static final String HISTORICAL_ACCOUNT_NAME = "Cuenta histórica";

    private final IncomeRepository incomeRepository;
    private final ExpenseRepository expenseRepository;
    private final FinancialTransactionRepository transactionRepository;
    private final LedgerEntryRepository entryRepository;
    private final AccountRepository accountRepository;
    private final LegacyAccountMappingRepository mappingRepository;
    private final TransactionTemplate transactionTemplate;

    public LegacyMigrationReport dryRun() {
        return migrate(false, DEFAULT_BATCH_SIZE);
    }

    public LegacyMigrationReport migrate(int batchSize) {
        if (batchSize < 1 || batchSize > 1000) {
            throw new IllegalArgumentException("El tamaño de lote debe estar entre 1 y 1000");
        }
        return migrate(true, batchSize);
    }

    private LegacyMigrationReport migrate(boolean apply, int batchSize) {
        int[] counters = new int[9];
        processIncomes(apply, batchSize, counters);
        processExpenses(apply, batchSize, counters);
        return new LegacyMigrationReport(counters[0], counters[1], counters[2], counters[3], counters[4], counters[5],
                counters[6], counters[7], counters[8], 0);
    }

    private void processIncomes(boolean apply, int batchSize, int[] counters) {
        long afterId = 0;
        while (true) {
            List<Income> batch = incomeRepository.findUnmigratedAfterId(afterId, PageRequest.of(0, batchSize));
            if (batch.isEmpty()) return;
            afterId = batch.getLast().getId();
            if (apply) transactionTemplate.executeWithoutResult(status -> batch.forEach(income -> migrateIncome(income, counters)));
            else batch.forEach(income -> inspectIncome(income, counters));
        }
    }

    private void processExpenses(boolean apply, int batchSize, int[] counters) {
        long afterId = 0;
        while (true) {
            List<Expense> batch = expenseRepository.findUnmigratedAfterId(afterId, PageRequest.of(0, batchSize));
            if (batch.isEmpty()) return;
            afterId = batch.getLast().getId();
            if (apply) transactionTemplate.executeWithoutResult(status -> batch.forEach(expense -> migrateExpense(expense, counters)));
            else batch.forEach(expense -> inspectExpense(expense, counters));
        }
    }

    private void inspectIncome(Income income, int[] counters) {
        counters[0]++;
        if (valid(income.getUser(), income.getAmount(), income.getIncomeDate())) counters[1]++; else counters[3]++;
    }

    private void inspectExpense(Expense expense, int[] counters) {
        counters[4]++;
        if (valid(expense.getUser(), expense.getAmount(), expense.getExpenseDate())
                && (expense.getCategory() == null || expense.getCategory().getUser().getId().equals(expense.getUser().getId()))) counters[5]++; else counters[7]++;
    }

    private void migrateIncome(Income income, int[] counters) {
        inspectIncome(income, counters);
        if (!valid(income.getUser(), income.getAmount(), income.getIncomeDate())) return;
        createTransaction(income.getUser(), LegacyOperationSource.INCOME, income.getId(), FinancialTransactionType.INCOME,
                income.getIncomeDate(), income.getAmount(), income.getDescription(), null, income.getIncomeType(), null, null, counters);
    }

    private void migrateExpense(Expense expense, int[] counters) {
        inspectExpense(expense, counters);
        if (!valid(expense.getUser(), expense.getAmount(), expense.getExpenseDate())
                || (expense.getCategory() != null && !expense.getCategory().getUser().getId().equals(expense.getUser().getId()))) return;
        createTransaction(expense.getUser(), LegacyOperationSource.EXPENSE, expense.getId(), FinancialTransactionType.EXPENSE,
                expense.getExpenseDate(), expense.getAmount().negate(), expense.getDescription(), expense.getCategory(), null,
                expense.getPaymentType(), expense.getExpenseType(), counters);
    }

    private void createTransaction(User user, LegacyOperationSource source, Long legacyId, FinancialTransactionType type,
                                   java.time.LocalDate date, BigDecimal signedAmount, String description,
                                   com.jr.finance.api.expense.Category category, String incomeType, String paymentType,
                                   String expenseType, int[] counters) {
        if (transactionRepository.existsByLegacySourceAndLegacyId(source, legacyId)) return;
        Account account = historicalAccount(user, counters);
        FinancialTransaction transaction = new FinancialTransaction();
        transaction.setUser(user); transaction.setType(type); transaction.setStatus(FinancialTransactionStatus.POSTED);
        transaction.setEffectiveDate(date); transaction.setDescription(description); transaction.setCategory(category);
        transaction.setCurrency(account.getCurrency()); transaction.setIncomeType(incomeType); transaction.setPaymentType(paymentType);
        transaction.setExpenseType(expenseType); transaction.setLegacySource(source); transaction.setLegacyId(legacyId);
        transaction = transactionRepository.saveAndFlush(transaction);
        LedgerEntry entry = new LedgerEntry(); entry.setFinancialTransaction(transaction); entry.setAccount(account); entry.setSignedAmount(signedAmount);
        entryRepository.saveAndFlush(entry);
    }

    private Account historicalAccount(User user, int[] counters) {
        return mappingRepository.findById(user.getId()).map(LegacyAccountMapping::getAccount).orElseGet(() -> {
            Account account = new Account(); account.setUser(user); account.setName(HISTORICAL_ACCOUNT_NAME);
            account.setType(AccountType.OTHER); account.setCurrency("COP"); account.setActive(false);
            account = accountRepository.saveAndFlush(account);
            LegacyAccountMapping mapping = new LegacyAccountMapping(); mapping.setUserId(user.getId()); mapping.setAccount(account);
            mappingRepository.saveAndFlush(mapping); counters[8]++; return account;
        });
    }

    private boolean valid(User user, BigDecimal amount, java.time.LocalDate date) {
        return user != null && amount != null && amount.signum() > 0 && date != null;
    }
}
