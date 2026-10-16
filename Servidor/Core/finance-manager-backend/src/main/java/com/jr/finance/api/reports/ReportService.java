package com.jr.finance.api.reports;

import com.jr.finance.api.common.FinancialPeriod;
import com.jr.finance.api.ledger.FinancialTransactionStatus;
import com.jr.finance.api.ledger.FinancialTransactionType;
import com.jr.finance.api.ledger.LedgerEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ReportService {
    private final LedgerEntryRepository entries;

    @Transactional(readOnly = true)
    public Map<String, MonthlyCurrencyReport> month(Long userId, int year, int month) {
        var period = FinancialPeriod.of(year, month);
        Map<String, BigDecimal> incomes = new HashMap<>();
        Map<String, BigDecimal> expenses = new HashMap<>();
        Map<String, Map<String, BigDecimal>> categories = new HashMap<>();
        for (var entry : entries.findByUserTypeAndPeriod(userId, FinancialTransactionType.INCOME,
                FinancialTransactionType.REVERSAL, period.atDay(1), period.atEndOfMonth(),
                FinancialTransactionStatus.VOIDED)) {
            incomes.merge(entry.getFinancialTransaction().getCurrency(), entry.getSignedAmount(), BigDecimal::add);
        }
        for (var entry : entries.findByUserTypeAndPeriod(userId, FinancialTransactionType.EXPENSE,
                FinancialTransactionType.REVERSAL, period.atDay(1), period.atEndOfMonth(),
                FinancialTransactionStatus.VOIDED)) {
            var currency = entry.getFinancialTransaction().getCurrency();
            var amount = entry.getSignedAmount().negate();
            expenses.merge(currency, amount, BigDecimal::add);
            var transaction = entry.getFinancialTransaction();
            var category = transaction.getType() == FinancialTransactionType.REVERSAL
                    && transaction.getReversalOf() != null
                    ? transaction.getReversalOf().getCategory() : transaction.getCategory();
            categories.computeIfAbsent(currency, ignored -> new HashMap<>())
                    .merge(category == null ? "Sin categoría" : category.getName(), amount, BigDecimal::add);
        }
        Map<String, MonthlyCurrencyReport> result = new HashMap<>();
        incomes.keySet().forEach(currency -> result.put(currency, new MonthlyCurrencyReport(
                incomes.getOrDefault(currency, BigDecimal.ZERO),
                expenses.getOrDefault(currency, BigDecimal.ZERO),
                Map.copyOf(categories.getOrDefault(currency, Map.of())))));
        expenses.keySet().forEach(currency -> result.putIfAbsent(currency, new MonthlyCurrencyReport(
                BigDecimal.ZERO, expenses.get(currency), Map.copyOf(categories.getOrDefault(currency, Map.of())))));
        return result;
    }
}
