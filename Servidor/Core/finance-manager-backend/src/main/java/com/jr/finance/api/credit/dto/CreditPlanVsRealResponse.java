package com.jr.finance.api.credit.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class CreditPlanVsRealResponse {

    private Long creditId;

    private BigDecimal plannedTotalToDate;   // Lo que deberías haber pagado a hoy
    private BigDecimal realTotalPaid;         // Lo que realmente pagaste

    private BigDecimal plannedCapitalPaid;    // Capital que deberías haber abonado
    private BigDecimal realCapitalPaid;       // Capital real abonado

    private BigDecimal plannedInterestPaid;   // Interés que deberías haber pagado
    private BigDecimal realInterestPaid;      // Interés real pagado

    private BigDecimal realCurrentBalance;    // Saldo real correcto

    private int plannedInstallments;          // Cuotas que deberías llevar
    private int realInstallments;             // Cuotas que llevas

    private String status; // ADELANTADO | AL_DIA | ATRASADO
}
