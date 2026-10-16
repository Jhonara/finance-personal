package com.jr.finance.api.reports;

import java.math.BigDecimal;
import java.util.Map;

public record MonthlyCurrencyReport(BigDecimal income, BigDecimal expense,
                                    Map<String, BigDecimal> expensesByCategory) {}
