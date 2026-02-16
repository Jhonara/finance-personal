package com.jr.finance.api.expense.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;

@Data
@AllArgsConstructor
public class MonthlySummaryResponse {
    private BigDecimal total;
    private BigDecimal fixedTotal;
    private BigDecimal variableTotal;
    private Map<String, BigDecimal> totalByCategory;
}
