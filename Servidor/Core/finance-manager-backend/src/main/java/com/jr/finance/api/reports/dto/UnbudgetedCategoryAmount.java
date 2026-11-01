package com.jr.finance.api.reports.dto;

import java.math.BigDecimal;

public record UnbudgetedCategoryAmount(Long categoryId, String categoryName, String parentCategoryName,
                                       BigDecimal spentAmount) { }
