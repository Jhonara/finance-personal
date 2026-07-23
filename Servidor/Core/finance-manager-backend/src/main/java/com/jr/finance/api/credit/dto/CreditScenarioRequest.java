package com.jr.finance.api.credit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Schema(
        name = "CreditScenarioRequest",
        description = "Representa un escenario de simulación con un abono extraordinario aplicado a una cuota específica."
)
public class CreditScenarioRequest {

    @Schema(
            description = "Número de la cuota en la que se realizará el abono extraordinario.",
            example = "12"
    )
    @NotNull(message = "La cuota del escenario es obligatoria")
    private Integer installment;

    @Schema(
            description = "Valor del abono extraordinario que será aplicado directamente al capital del crédito.",
            example = "2000000.00"
    )
    @NotNull(message = "El abono del escenario es obligatorio")
    @Positive(message = "El abono del escenario debe ser mayor que 0")
    private BigDecimal extraPayment;
}