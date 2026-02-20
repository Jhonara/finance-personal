package com.jr.finance.api.credit.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@AllArgsConstructor
public class CreditStatusResponse {

    private Long creditId;
    private BigDecimal originalAmount;
    private BigDecimal currentBalance;
    private BigDecimal totalPaid;
    private BigDecimal totalExtraPaid;
    private int paidInstallments;
    private int remainingInstallments;
    private LocalDate lastPaymentDate;
}
