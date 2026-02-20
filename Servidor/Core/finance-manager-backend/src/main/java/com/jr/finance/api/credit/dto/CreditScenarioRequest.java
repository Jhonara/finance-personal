package com.jr.finance.api.credit.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreditScenarioRequest {

    @NotNull(message = "La cuota del escenario es obligatoria")
    private Integer installment;

    @NotNull(message = "El abono del escenario es obligatorio")
    @Positive(message = "El abono del escenario debe ser mayor que 0")
    private BigDecimal extraPayment;
}
