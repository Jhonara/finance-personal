package com.jr.finance.api.saving.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Schema(
        name = "CreateSavingGoalRequest",
        description = "Información necesaria para crear una nueva meta de ahorro."
)
public class CreateSavingGoalRequest {

    @NotBlank(message = "El nombre es obligatorio")
    @Schema(
            description = "Nombre de la meta de ahorro.",
            example = "Viaje a Europa",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private String name;

    @NotNull(message = "El monto objetivo es obligatorio")
    @Positive(message = "El monto objetivo debe ser mayor que 0")
    @Schema(
            description = "Monto objetivo que se desea alcanzar.",
            example = "10000000.00",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private BigDecimal targetAmount;
}