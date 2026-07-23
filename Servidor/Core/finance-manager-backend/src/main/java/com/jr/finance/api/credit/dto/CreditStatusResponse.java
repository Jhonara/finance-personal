package com.jr.finance.api.credit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@AllArgsConstructor
@Schema(
        name = "CreditStatusResponse",
        description = "Resumen del estado actual de un crédito con base en los pagos registrados."
)
public class CreditStatusResponse {

    @Schema(
            description = "Identificador único del crédito.",
            example = "1"
    )
    private Long creditId;

    @Schema(
            description = "Monto original desembolsado del crédito.",
            example = "30000000.00"
    )
    private BigDecimal originalAmount;

    @Schema(
            description = "Saldo actual pendiente del crédito.",
            example = "18250000.50"
    )
    private BigDecimal currentBalance;

    @Schema(
            description = "Valor total pagado por el usuario, sin incluir abonos extraordinarios.",
            example = "12500000.00"
    )
    private BigDecimal totalPaid;

    @Schema(
            description = "Valor total abonado extraordinariamente al capital del crédito.",
            example = "2500000.00"
    )
    private BigDecimal totalExtraPaid;

    @Schema(
            description = "Cantidad de cuotas pagadas hasta el momento.",
            example = "18"
    )
    private int paidInstallments;

    @Schema(
            description = "Cantidad de cuotas pendientes por pagar.",
            example = "42"
    )
    private int remainingInstallments;

    @Schema(
            description = "Fecha del último pago registrado.",
            example = "2026-07-15"
    )
    private LocalDate lastPaymentDate;
}