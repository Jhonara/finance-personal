package com.jr.finance.api.saving.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Schema(
        name = "AddSavingMovementRequest",
        description = "Información necesaria para registrar un aporte a una meta de ahorro."
)
public class AddSavingMovementRequest {

    @NotNull(message = "El monto es obligatorio")
    @Positive(message = "El aporte al objetivo debe ser mayor que 0")
    @Schema(
            description = "Valor del aporte realizado a la meta de ahorro.",
            example = "250000.00",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private BigDecimal amount;

    @NotNull(message = "La fecha es obligatoria")
    @Schema(
            description = "Fecha en la que se realizó el aporte.",
            example = "2026-07-22",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private LocalDate movementDate;
}