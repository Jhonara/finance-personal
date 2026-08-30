package com.jr.finance.api.credit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
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
            description = "Monto total pagado. El servidor distribuye interés, capital y abono extra.",
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
            description = "Parte opcional del monto total aplicada íntegramente a capital.",
            example = "50000.00",
            nullable = true
    )
    @PositiveOrZero(message = "El abono extra no puede ser negativo")
    private BigDecimal extraPrincipalAmount;
    @Schema(description = "Cuenta opcional desde la que salió el efectivo. Si se envía crea CREDIT_PAYMENT en el ledger.", example = "1")
    private Long accountId;
}
