package com.jr.finance.api.income.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateIncomeRequest {

    @NotNull(message = "El monto del ingreso es obligatorio")
    @Positive(message = "El monto del ingreso debe ser mayor que 0")
    private BigDecimal amount;

    private String description;

    @NotNull(message = "El tipo de ingreso es obligatorio")
    private String incomeType; // SALARY, EXTRA

    @NotNull(message = "La fecha del ingreso es obligatoria")
    private LocalDate incomeDate;
}
