package com.jr.finance.api.credit.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class CreditScenarioCompareResponse {

    private String scenario;
    private BigDecimal totalToPayToday;
    private int savedInstallments;
    private int remainingInstallments;
}