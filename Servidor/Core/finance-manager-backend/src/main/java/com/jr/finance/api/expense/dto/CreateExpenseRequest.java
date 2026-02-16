package com.jr.finance.api.expense.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateExpenseRequest {

    @NotNull(message = "El monto es obligatorio")
    @Positive(message = "El monto debe ser mayor que 0")
    private BigDecimal amount;

    private String description;

    @NotNull(message = "El tipo de pago es obligatorio")
    private String paymentType; // CASH, CARD, CREDIT

    @NotNull(message = "El tipo de gasto es obligatorio")
    private String expenseType; // FIXED, VARIABLE

    @NotNull(message = "La fecha del gasto es obligatoria")
    private LocalDate expenseDate;

    private Long categoryId;
}
