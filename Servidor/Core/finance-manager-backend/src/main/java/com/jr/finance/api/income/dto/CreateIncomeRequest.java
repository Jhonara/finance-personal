package com.jr.finance.api.income.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Schema(
        name = "CreateIncomeRequest",
        description = "Información necesaria para registrar un nuevo ingreso."
)
public class CreateIncomeRequest {

    @NotNull(message = "El monto del ingreso es obligatorio")
    @Positive(message = "El monto del ingreso debe ser mayor que 0")
    @Schema(
            description = "Valor del ingreso.",
            example = "3500000.00",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private BigDecimal amount;

    @Schema(
            description = "Descripción opcional del ingreso.",
            example = "Salario correspondiente al mes de julio."
    )
    private String description;

    @NotNull(message = "El tipo de ingreso es obligatorio")
    @Schema(
            description = "Campo transitorio de compatibilidad para clasificar el ingreso. Se mantiene mientras evoluciona el contrato; use categoryId cuando aplique.",
            example = "SALARY",
            deprecated = true,
            allowableValues = {
                    "SALARY",
                    "EXTRA"
            },
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private String incomeType;

    @Schema(description = "Categoría de ingreso opcional. Debe ser una categoría INCOME activa del usuario.", example = "3")
    private Long categoryId;

    @NotNull(message = "La fecha del ingreso es obligatoria")
    @Schema(
            description = "Fecha en la que se recibió el ingreso.",
            example = "2026-07-22",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private LocalDate incomeDate;

    @NotNull(message = "La cuenta es obligatoria")
    @Schema(description = "Cuenta que recibe el ingreso.", example = "1", requiredMode = Schema.RequiredMode.REQUIRED)
    private Long accountId;
}
