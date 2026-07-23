package com.jr.finance.api.credit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Schema(
        name = "CreateCreditPaymentRequest",
        description = "Información necesaria para registrar un pago de un crédito."
)
public class CreateCreditPaymentRequest {

    @Schema(
            description = "Valor del pago realizado al crédito.",
            example = "850000.00"
    )
    @NotNull(message = "El monto del pago es obligatorio")
    @Positive(message = "El monto del pago debe ser mayor que 0")
    private BigDecimal amount;

    @Schema(
            description = "Fecha en la que se realizó el pago.",
            example = "2026-08-15"
    )
    @NotNull(message = "La fecha del pago es obligatoria")
    private LocalDate paymentDate;

    @Schema(
            description = "Abono extraordinario aplicado directamente al capital del crédito. Este campo es opcional.",
            example = "500000.00",
            nullable = true
    )
    private BigDecimal extraPayment;
}