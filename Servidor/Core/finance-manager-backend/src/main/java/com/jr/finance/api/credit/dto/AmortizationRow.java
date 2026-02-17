package com.jr.finance.api.credit.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@AllArgsConstructor
public class AmortizationRow {
    private int installment;
    private LocalDate date;
    private BigDecimal openingBalance;
    private int days;
    private BigDecimal interest;
    private BigDecimal principalPayment;
    private BigDecimal endingBalance;
    private BigDecimal extraPayment;
}