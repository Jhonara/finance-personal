package com.jr.finance.api.reports.dto;

import java.math.BigDecimal;

public record CategoryReportItem(Long categoryId, String categoryName, BigDecimal amount) { }
