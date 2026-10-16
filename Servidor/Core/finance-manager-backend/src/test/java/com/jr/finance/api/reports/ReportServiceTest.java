package com.jr.finance.api.reports;

import com.jr.finance.api.expense.Category;
import com.jr.finance.api.ledger.FinancialTransaction;
import com.jr.finance.api.ledger.FinancialTransactionStatus;
import com.jr.finance.api.ledger.FinancialTransactionType;
import com.jr.finance.api.ledger.LedgerEntry;
import com.jr.finance.api.ledger.LedgerEntryRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ReportServiceTest {
    @Test
    void separatesCurrenciesAndNetsReversalsIntoOriginalExpenseCategory() {
        var entries = mock(LedgerEntryRepository.class);
        var food = new Category();
        food.setName("Comida");
        var originalExpense = transaction(FinancialTransactionType.EXPENSE, "COP", food);
        var reversal = transaction(FinancialTransactionType.REVERSAL, "COP", null);
        reversal.setReversalOf(originalExpense);
        when(entries.findByUserTypeAndPeriod(eq(9L), eq(FinancialTransactionType.INCOME),
                eq(FinancialTransactionType.REVERSAL), any(LocalDate.class), any(LocalDate.class),
                eq(FinancialTransactionStatus.VOIDED)))
                .thenReturn(List.of(entry(FinancialTransactionType.INCOME, "COP", "100", null),
                        entry(FinancialTransactionType.INCOME, "USD", "20", null)));
        when(entries.findByUserTypeAndPeriod(eq(9L), eq(FinancialTransactionType.EXPENSE),
                eq(FinancialTransactionType.REVERSAL), any(LocalDate.class), any(LocalDate.class),
                eq(FinancialTransactionStatus.VOIDED)))
                .thenReturn(List.of(entry(originalExpense, "-50"), entry(reversal, "10"),
                        entry(FinancialTransactionType.EXPENSE, "USD", "-8", null)));

        var report = new ReportService(entries).month(9L, 2026, 10);

        assertThat(report).containsOnlyKeys("COP", "USD");
        assertThat(report.get("COP").income()).isEqualByComparingTo("100");
        assertThat(report.get("COP").expense()).isEqualByComparingTo("40");
        assertThat(report.get("COP").expensesByCategory()).containsEntry("Comida", new BigDecimal("40"));
        assertThat(report.get("USD").income()).isEqualByComparingTo("20");
        assertThat(report.get("USD").expense()).isEqualByComparingTo("8");
    }

    private static FinancialTransaction transaction(FinancialTransactionType type, String currency, Category category) {
        var result = new FinancialTransaction();
        result.setType(type);
        result.setCurrency(currency);
        result.setCategory(category);
        return result;
    }

    private static LedgerEntry entry(FinancialTransactionType type, String currency, String amount, Category category) {
        return entry(transaction(type, currency, category), amount);
    }

    private static LedgerEntry entry(FinancialTransaction transaction, String amount) {
        var result = new LedgerEntry();
        result.setFinancialTransaction(transaction);
        result.setSignedAmount(new BigDecimal(amount));
        return result;
    }
}
