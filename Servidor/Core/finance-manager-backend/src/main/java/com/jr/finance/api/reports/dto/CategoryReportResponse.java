package com.jr.finance.api.reports.dto;

import com.jr.finance.api.expense.CategoryType;

import java.math.BigDecimal;
import java.util.List;

public record CategoryReportResponse(int year, int month, String currency, CategoryType type,
                                    BigDecimal totalAmount, List<CategoryReportGroup> groups) { }
