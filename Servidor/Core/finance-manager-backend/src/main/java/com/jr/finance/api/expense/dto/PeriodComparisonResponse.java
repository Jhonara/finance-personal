package com.jr.finance.api.expense.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class PeriodComparisonResponse {
    private int year1;
    private int month1;
    private BigDecimal total1;

    private int year2;
    private int month2;
    private BigDecimal total2;

    private BigDecimal difference;        // total1 - total2
    private BigDecimal percentageChange;  // vs periodo 2
    private String insight;
}
