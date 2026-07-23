package com.jr.finance.api.expense.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Schema(
        name = "ExpenseResponse",
        description = "Información de un gasto registrado."
)
public class ExpenseResponse {

    @Schema(description = "Identificador del gasto.", example = "1")
    private Long id;

    @Schema(description = "Nombre de la categoría.", example = "Alimentación")
    private String category;

    @Schema(description = "Valor del gasto.", example = "85000.00")
    private BigDecimal amount;

    @Schema(description = "Descripción del gasto.", example = "Compra en supermercado")
    private String description;

    @Schema(description = "Tipo de pago.", example = "CARD")
    private String paymentType;

    @Schema(description = "Tipo de gasto.", example = "VARIABLE")
    private String expenseType;

    @Schema(description = "Fecha del gasto.", example = "2026-07-22")
    private LocalDate expenseDate;
}