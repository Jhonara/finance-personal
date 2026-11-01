package com.jr.finance.api.reports.dto;

import java.math.BigDecimal;
import java.util.List;

public record CategoryReportGroup(Long categoryId, String categoryName, BigDecimal amount,
                                  BigDecimal directAmount, List<CategoryReportItem> subcategories) { }
