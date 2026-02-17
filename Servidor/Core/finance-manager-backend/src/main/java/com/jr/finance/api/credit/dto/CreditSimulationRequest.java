package com.jr.finance.api.credit.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Data
public class CreditSimulationRequest {

    @NotNull(message = "El monto del crédito es obligatorio")
    @Positive(message = "El monto del crédito debe ser mayor que 0")
    private BigDecimal principal;

    @NotNull(message = "La tasa EA es obligatoria")
    @Positive(message = "La tasa EA debe ser mayor que 0")
    private BigDecimal annualRate; // EA %

    @NotNull(message = "El plazo en meses es obligatorio")
    @Min(value = 1, message = "El plazo mínimo es 1 mes")
    private Integer termMonths;

    @NotNull(message = "La fecha de desembolso es obligatoria")
    private LocalDate disbursementDate;

    @NotNull(message = "El día de pago es obligatorio")
    @Min(value = 1, message = "El día de pago debe estar entre 1 y 31")
    @Max(value = 31, message = "El día de pago debe estar entre 1 y 31")
    private Integer paymentDay;

    // Opcionales
    private Integer currentInstallment; // ej: 4
    private LocalDate today;            // para interés a hoy

    // Abonos extra: { "6": 1500000, "10": 500000 }
    private Map<Integer, BigDecimal> extraPayments;
}
