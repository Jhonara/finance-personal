package com.jr.finance.api.credit.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@AllArgsConstructor
public class CreditSimulationResponse {

    private BigDecimal monthlyRate;       // % mensual efectiva
    private BigDecimal dailyRate;         // % diaria
    private BigDecimal installmentValue;  // valor cuota

    private int remainingInstallments;
    private int savedInstallments;

    private BigDecimal balanceAfterLastPayment;
    private long daysSinceLastPayment;
    private BigDecimal interestToday;
    private BigDecimal totalToPayToday;

    private List<AmortizationRow> schedule;
}
