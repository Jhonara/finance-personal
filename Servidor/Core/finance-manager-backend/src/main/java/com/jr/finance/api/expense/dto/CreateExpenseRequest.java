package com.jr.finance.api.expense.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateExpenseRequest {
    @NotNull
    private BigDecimal amount;

    private String description;

    private String paymentType;
    private String expenseType;

    @NotNull
    private LocalDate expenseDate;

    private Long categoryId;
}
