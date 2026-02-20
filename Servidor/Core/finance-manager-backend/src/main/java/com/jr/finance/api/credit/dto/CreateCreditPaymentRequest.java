package com.jr.finance.api.credit.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateCreditPaymentRequest {

    @NotNull(message = "El monto del pago es obligatorio")
    @Positive(message = "El monto del pago debe ser mayor que 0")
    private BigDecimal amount;

    @NotNull(message = "La fecha del pago es obligatoria")
    private LocalDate paymentDate;

    // Opcional
    private BigDecimal extraPayment;
}
