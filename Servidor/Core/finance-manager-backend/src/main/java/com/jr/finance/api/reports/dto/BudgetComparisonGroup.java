package com.jr.finance.api.reports.dto;

import java.math.BigDecimal;
import java.util.List;

public record BudgetComparisonGroup(Long categoryId, String categoryName, BigDecimal limitAmount,
                                    BigDecimal spentAmount, BigDecimal budgetedSpentAmount, BigDecimal differenceAmount,
                                    BigDecimal percentageUsed, BigDecimal remainingAmount,
                                    BigDecimal excessAmount, boolean hasBudget, boolean hasParentBudget,
                                    BigDecimal directSpentAmount, List<BudgetComparisonItem> subcategories) { }
