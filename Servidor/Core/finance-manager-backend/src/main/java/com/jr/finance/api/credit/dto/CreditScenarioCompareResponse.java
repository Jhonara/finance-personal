package com.jr.finance.api.credit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@Schema(
        name = "CreditScenarioCompareResponse",
        description = "Resultado obtenido al simular un escenario de abono extraordinario sobre un crédito."
)
public class CreditScenarioCompareResponse {

    @Schema(
            description = "Nombre o identificación del escenario evaluado.",
            example = "Abono de $2.000.000 en la cuota 12"
    )
    private String scenario;

    @Schema(
            description = "Valor total que se debería pagar hoy para cancelar el crédito según el escenario simulado.",
            example = "15850000.00"
    )
    private BigDecimal totalToPayToday;

    @Schema(
            description = "Cantidad de cuotas que se ahorrarían al aplicar este escenario.",
            example = "8"
    )
    private int savedInstallments;

    @Schema(
            description = "Cantidad de cuotas restantes después de aplicar el escenario.",
            example = "28"
    )
    private int remainingInstallments;
}