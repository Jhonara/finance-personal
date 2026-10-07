package com.jr.finance.api.credit.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Schema(description = "Comparación de la proyección actual con un abono hipotético a capital.")
public record CreditAmortizationScenarioResponse(
        int installment,
        BigDecimal extraAmount,
        int baselineRemainingInstallments,
        int scenarioRemainingInstallments,
        int savedInstallments,
        BigDecimal baselineRemainingInterest,
        BigDecimal scenarioRemainingInterest,
        BigDecimal interestSaved,
        LocalDate baselinePayoffDate,
        LocalDate scenarioPayoffDate,
        List<AmortizationRow> schedule,
        CreditAmortizationScenarioRequest.Strategy strategy,
        BigDecimal monthlyPaymentAfterExtra,
        List<CreditAmortizationScenarioRequest.Contribution> contributions
) { }
