package com.jr.finance.api.credit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Data
@Schema(
        name = "CreditSimulationRequest",
        description = "Información necesaria para simular un crédito o proyectar escenarios de amortización."
)
public class CreditSimulationRequest {

    @Schema(
            description = "Monto inicial del crédito.",
            example = "30000000.00"
    )
    @NotNull(message = "El monto del crédito es obligatorio")
    @Positive(message = "El monto del crédito debe ser mayor que 0")
    private BigDecimal principal;

    @Schema(
            description = "Tasa de interés efectiva anual (EA) expresada en porcentaje.",
            example = "18.50"
    )
    @NotNull(message = "La tasa EA es obligatoria")
    @PositiveOrZero(message = "La tasa EA no puede ser negativa")
    private BigDecimal annualRate;

    @Schema(
            description = "Cantidad total de cuotas del crédito.",
            example = "60"
    )
    @NotNull(message = "El plazo en meses es obligatorio")
    @Min(value = 1, message = "El plazo mínimo es 1 mes")
    private Integer termMonths;

    @Schema(
            description = "Fecha de desembolso del crédito.",
            example = "2026-08-15"
    )
    @NotNull(message = "La fecha de desembolso es obligatoria")
    private LocalDate disbursementDate;

    @Schema(
            description = "Día del mes en el que se realiza el pago de la cuota.",
            example = "15",
            minimum = "1",
            maximum = "31"
    )
    @NotNull(message = "El día de pago es obligatorio")
    @Min(value = 1, message = "El día de pago debe estar entre 1 y 31")
    @Max(value = 31, message = "El día de pago debe estar entre 1 y 31")
    private Integer paymentDay;

    @Schema(
            description = "Cuota actual del crédito desde la cual se realizará la simulación. Campo opcional.",
            example = "8",
            nullable = true
    )
    private Integer currentInstallment;

    @Schema(
            description = "Fecha utilizada como referencia para calcular intereses acumulados. Si no se envía, se utilizará la fecha actual. Campo opcional.",
            example = "2026-12-20",
            nullable = true
    )
    private LocalDate today;

    @Schema(
            description = "Mapa de abonos extraordinarios donde la llave representa el número de la cuota y el valor corresponde al monto del abono adicional al capital.",
            example = "{\"6\":1500000,\"12\":500000}"
    )
    private Map<Integer, BigDecimal> extraPayments;
}
