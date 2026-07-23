package com.jr.finance.api.common.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
@Schema(
        name = "MonthlyBalanceResponse",
        description = "Resumen financiero correspondiente a un mes."
)
@Data
@AllArgsConstructor
public class MonthlyBalanceResponse {
    @Schema(
            description = "Año registrado.",
            example = "2026"
    )
    private int year;
    @Schema(
            description = "Mes registrado.",
            example = "06"
    )
    private int month;
    @Schema(
            description = "Total de ingresos registrados durante el mes.",
            example = "3500000"
    )
    private BigDecimal totalIncome;
    @Schema(
            description = "Total de gastos registrados durante el mes.",
            example = "2450000"
    )
    private BigDecimal totalExpense;
    @Schema(
            description = "Balance del mes (ingresos - gastos).",
            example = "1050000"
    )
    private BigDecimal balance;   // income - expense
    @Schema(
            description = "Mensaje generado para mostrar un resumen financiero al usuario.",
            example = "Este mes lograste ahorrar más que el anterior."
    )
    private String insight;       // texto para UI/IA
}