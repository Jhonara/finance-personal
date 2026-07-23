package com.jr.finance.api.expense.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;

@Data
@AllArgsConstructor
@Schema(
        name = "MonthlySummaryResponse",
        description = "Resumen de los gastos registrados durante un período determinado."
)
public class MonthlySummaryResponse {

    @Schema(
            description = "Monto total de gastos del período.",
            example = "3250000.00"
    )
    private BigDecimal total;

    @Schema(
            description = "Total correspondiente a gastos fijos.",
            example = "1800000.00"
    )
    private BigDecimal fixedTotal;

    @Schema(
            description = "Total correspondiente a gastos variables.",
            example = "1450000.00"
    )
    private BigDecimal variableTotal;

    @Schema(
            description = "Mapa con el total gastado por cada categoría. La clave representa el nombre de la categoría y el valor el monto total gastado.",
            example = "{\"Alimentación\":850000.00,\"Transporte\":420000.00,\"Entretenimiento\":180000.00}"
    )
    private Map<String, BigDecimal> totalByCategory;
}