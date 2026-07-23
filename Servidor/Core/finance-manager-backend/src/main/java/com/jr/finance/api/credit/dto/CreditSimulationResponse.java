package com.jr.finance.api.credit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@AllArgsConstructor
@Schema(
        name = "CreditSimulationResponse",
        description = "Resultado de la simulación de un crédito, incluyendo tasas, valores calculados y la tabla de amortización."
)
public class CreditSimulationResponse {

    @Schema(
            description = "Tasa de interés efectiva mensual calculada a partir de la tasa efectiva anual (EA).",
            example = "1.42"
    )
    private BigDecimal monthlyRate;

    @Schema(
            description = "Tasa de interés diaria utilizada para el cálculo de intereses entre pagos.",
            example = "0.0467"
    )
    private BigDecimal dailyRate;

    @Schema(
            description = "Valor estimado de cada cuota del crédito.",
            example = "845320.55"
    )
    private BigDecimal installmentValue;

    @Schema(
            description = "Cantidad de cuotas restantes según la simulación.",
            example = "32"
    )
    private int remainingInstallments;

    @Schema(
            description = "Cantidad de cuotas que se ahorrarían gracias a los abonos extraordinarios simulados.",
            example = "8"
    )
    private int savedInstallments;

    @Schema(
            description = "Saldo pendiente del crédito después del último pago considerado en la simulación.",
            example = "18500000.00"
    )
    private BigDecimal balanceAfterLastPayment;

    @Schema(
            description = "Número de días transcurridos desde el último pago hasta la fecha de simulación.",
            example = "18"
    )
    private long daysSinceLastPayment;

    @Schema(
            description = "Intereses generados desde el último pago hasta la fecha de simulación.",
            example = "145250.80"
    )
    private BigDecimal interestToday;

    @Schema(
            description = "Valor total necesario para cancelar el crédito en la fecha de la simulación.",
            example = "18645250.80"
    )
    private BigDecimal totalToPayToday;

    @Schema(
            description = "Tabla de amortización generada para el crédito simulado."
    )
    private List<AmortizationRow> schedule;
}