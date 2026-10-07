package com.jr.finance.api.credit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Digits;

import java.math.BigDecimal;

@Schema(description = "Abono hipotético a capital en una cuota futura; no registra un pago.")
public record CreditAmortizationScenarioRequest(
        @Min(1) Integer installment,
        @DecimalMin("0.01") @Digits(integer = 17, fraction = 2) BigDecimal extraAmount,
        Strategy strategy,
        @jakarta.validation.constraints.Size(min = 1, max = 1200)
        java.util.List<@NotNull @jakarta.validation.Valid Contribution> contributions
) {
    public enum Strategy { REDUCE_TERM, REDUCE_PAYMENT }
    public record Contribution(@NotNull @Min(1) Integer installment,
            @NotNull @DecimalMin("0.01") @Digits(integer = 17, fraction = 2) BigDecimal amount) { }

    public CreditAmortizationScenarioRequest(Integer installment, BigDecimal extraAmount, Strategy strategy) {
        this(installment, extraAmount, strategy, null);
    }

    public CreditAmortizationScenarioRequest(Integer installment, BigDecimal extraAmount) {
        this(installment, extraAmount, Strategy.REDUCE_TERM);
    }

    public CreditAmortizationScenarioRequest {
        if (strategy == null) strategy = Strategy.REDUCE_TERM;
    }
}
