package com.jr.finance.api.credit.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateCreditRequest {

    @NotBlank(message = "El nombre del crédito es obligatorio")
    private String name;

    @NotNull(message = "El monto del crédito es obligatorio")
    @Positive(message = "El monto del crédito debe ser mayor que 0")
    private BigDecimal principal;   // amount

    @NotNull(message = "La tasa EA es obligatoria")
    @Positive(message = "La tasa EA debe ser mayor que 0")
    private BigDecimal annualRate;  // interest_rate (EA)

    @NotNull(message = "El plazo en meses es obligatorio")
    @Min(value = 1, message = "El plazo mínimo es 1 mes")
    private Integer termMonths;     // installments

    @NotNull(message = "La fecha de desembolso es obligatoria")
    private LocalDate disbursementDate; // start_date

    @NotNull(message = "El día de pago es obligatorio")
    @Min(value = 1, message = "El día de pago debe estar entre 1 y 31")
    @Max(value = 31, message = "El día de pago debe estar entre 1 y 31")
    private Integer paymentDay;
}
