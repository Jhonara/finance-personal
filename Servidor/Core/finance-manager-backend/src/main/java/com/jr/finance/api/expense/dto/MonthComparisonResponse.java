package com.jr.finance.api.expense.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@Schema(
        name = "MonthComparisonResponse",
        description = "Resultado de la comparación de gastos entre el mes actual y el mes anterior."
)
public class MonthComparisonResponse {

    @Schema(
            description = "Año consultado.",
            example = "2026"
    )
    private int year;

    @Schema(
            description = "Mes consultado (1-12).",
            example = "7"
    )
    private int month;

    @Schema(
            description = "Total de gastos del mes consultado.",
            example = "2450000.00"
    )
    private BigDecimal currentTotal;

    @Schema(
            description = "Total de gastos del mes anterior.",
            example = "2180000.00"
    )
    private BigDecimal previousTotal;

    @Schema(
            description = "Diferencia entre el gasto actual y el del mes anterior.",
            example = "270000.00"
    )
    private BigDecimal difference;

    @Schema(
            description = "Porcentaje de variación respecto al mes anterior. Puede ser null cuando el mes anterior no registra gastos.",
            example = "12.39",
            nullable = true
    )
    private BigDecimal percentageChange;

    @Schema(
            description = "Resumen textual listo para mostrar en la interfaz o ser utilizado por el módulo de Inteligencia Artificial.",
            example = "Tus gastos aumentaron un 12.39% respecto al mes anterior."
    )
    private String insight;
}