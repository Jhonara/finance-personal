package com.jr.finance.api.expense.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@Schema(
        name = "PeriodComparisonResponse",
        description = "Resultado de la comparación de gastos entre dos períodos específicos."
)
public class PeriodComparisonResponse {

    @Schema(
            description = "Año del primer período.",
            example = "2026"
    )
    private int year1;

    @Schema(
            description = "Mes del primer período (1-12).",
            example = "7"
    )
    private int month1;

    @Schema(
            description = "Total de gastos del primer período.",
            example = "2450000.00"
    )
    private BigDecimal total1;

    @Schema(
            description = "Año del segundo período.",
            example = "2026"
    )
    private int year2;

    @Schema(
            description = "Mes del segundo período (1-12).",
            example = "6"
    )
    private int month2;

    @Schema(
            description = "Total de gastos del segundo período.",
            example = "2180000.00"
    )
    private BigDecimal total2;

    @Schema(
            description = "Diferencia entre ambos períodos (total1 - total2).",
            example = "270000.00"
    )
    private BigDecimal difference;

    @Schema(
            description = "Porcentaje de variación tomando como referencia el segundo período. Puede ser null cuando el segundo período no registra gastos.",
            example = "12.39",
            nullable = true
    )
    private BigDecimal percentageChange;

    @Schema(
            description = "Resumen textual listo para mostrar en la interfaz o ser utilizado por el módulo de Inteligencia Artificial.",
            example = "Los gastos del primer período aumentaron un 12.39% respecto al segundo."
    )
    private String insight;
}