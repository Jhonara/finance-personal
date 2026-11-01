package com.jr.finance.api.reports.dto;

import java.math.BigDecimal;
import java.util.List;

public record BudgetComparisonResponse(int year, int month, String currency, BigDecimal totalBudgetedAmount,
                                       BigDecimal totalSpentAmount, BigDecimal totalSpentOnBudgetedCategories,
                                       BigDecimal totalUnbudgetedAmount, List<BudgetComparisonGroup> groups,
                                       List<UnbudgetedCategoryAmount> unbudgetedCategories) { }
