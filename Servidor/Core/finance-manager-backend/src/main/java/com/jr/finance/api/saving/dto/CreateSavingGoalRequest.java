package com.jr.finance.api.saving.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Schema(
        name = "CreateSavingGoalRequest",
        description = "Información necesaria para crear una nueva meta de ahorro."
)
public class CreateSavingGoalRequest {

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 100, message = "El nombre de la meta admite hasta 100 caracteres")
    @Schema(
            description = "Nombre de la meta de ahorro.",
            example = "Viaje a Europa",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private String name;

    @Size(max = 500)
    private String description;

    private java.time.LocalDate targetDate;

    @NotBlank(message = "La moneda es obligatoria")
    @Pattern(regexp = "[A-Z]{3}", message = "Usa una moneda de tres letras")
    private String currency;

    @NotNull(message = "El monto objetivo es obligatorio")
    @Positive(message = "El monto objetivo debe ser mayor que 0")
    @Digits(integer = 15, fraction = 4, message = "El monto objetivo admite hasta 15 enteros y 4 decimales")
    @Schema(
            description = "Monto objetivo que se desea alcanzar.",
            example = "10000000.00",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private BigDecimal targetAmount;
}
