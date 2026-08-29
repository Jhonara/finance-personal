package com.jr.finance.api.expense.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Schema(
        name = "CreateExpenseRequest",
        description = "Información necesaria para registrar un nuevo gasto."
)
public class CreateExpenseRequest {

    @Schema(
            description = "Valor del gasto.",
            example = "85000.00"
    )
    @NotNull(message = "El monto es obligatorio")
    @Positive(message = "El monto debe ser mayor que 0")
    private BigDecimal amount;

    @Schema(
            description = "Descripción opcional del gasto.",
            example = "Compra de mercado semanal"
    )
    private String description;

    @Schema(
            description = "Método de pago utilizado.",
            example = "CARD",
            allowableValues = {
                    "CASH",
                    "CARD",
                    "CREDIT"
            }
    )
    @NotNull(message = "El tipo de pago es obligatorio")
    private String paymentType;

    @Schema(
            description = "Clasificación del gasto.",
            example = "VARIABLE",
            allowableValues = {
                    "FIXED",
                    "VARIABLE"
            }
    )
    @NotNull(message = "El tipo de gasto es obligatorio")
    private String expenseType;

    @Schema(
            description = "Fecha en la que se realizó el gasto.",
            example = "2026-07-22"
    )
    @NotNull(message = "La fecha del gasto es obligatoria")
    private LocalDate expenseDate;

    @Schema(
            description = "Identificador de la categoría asociada al gasto. Es opcional.",
            example = "3"
    )
    private Long categoryId;

    @NotNull(message = "La cuenta es obligatoria")
    @Schema(description = "Cuenta afectada por el gasto.", example = "1", requiredMode = Schema.RequiredMode.REQUIRED)
    private Long accountId;
}
