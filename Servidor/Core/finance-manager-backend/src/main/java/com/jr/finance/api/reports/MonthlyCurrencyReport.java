package com.jr.finance.api.reports;

import java.math.BigDecimal;
import java.util.Map;

public record MonthlyCurrencyReport(BigDecimal income, BigDecimal expense,
                                    Map<String, BigDecimal> expensesByCategory,
                                    Map<String, BigDecimal> expensesByDay) {
    public MonthlyCurrencyReport(BigDecimal income, BigDecimal expense, Map<String, BigDecimal> expensesByCategory) {
        this(income, expense, expensesByCategory, Map.of());
    }
}
