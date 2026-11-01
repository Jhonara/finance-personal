package com.jr.finance.api.reports.dto;

import java.math.BigDecimal;

public record BudgetComparisonItem(Long categoryId, String categoryName, BigDecimal limitAmount,
                                   BigDecimal spentAmount, BigDecimal differenceAmount,
                                   BigDecimal percentageUsed, BigDecimal remainingAmount,
                                   BigDecimal excessAmount, boolean hasBudget,
                                   boolean coveredByParentBudget) { }
