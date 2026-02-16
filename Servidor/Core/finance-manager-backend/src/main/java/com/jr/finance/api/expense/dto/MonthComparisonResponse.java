package com.jr.finance.api.expense.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class MonthComparisonResponse {
    private int year;
    private int month;
    private BigDecimal currentTotal;
    private BigDecimal previousTotal;
    private BigDecimal difference;
    private BigDecimal percentageChange; // puede ser null si el mes anterior es 0
    private String insight; // texto listo para UI/IA
}
