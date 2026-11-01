package com.jr.finance.api.saving.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Digits;
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
    @Digits(integer = 15, fraction = 4, message = "El aporte admite hasta 15 enteros y 4 decimales")
    @Schema(
            description = "Valor del aporte realizado a la meta de ahorro.",
            example = "250000.00",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private BigDecimal amount;

    @jakarta.validation.constraints.PositiveOrZero
    private Long version;

    @jakarta.validation.constraints.Pattern(regexp = "[A-Za-z0-9_-]{1,64}")
    private String requestId;

    @jakarta.validation.constraints.Size(max = 255)
    private String description;

    @NotNull(message = "La fecha es obligatoria")
    @Schema(
            description = "Fecha en la que se realizó el aporte.",
            example = "2026-07-22",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private LocalDate movementDate;
}
