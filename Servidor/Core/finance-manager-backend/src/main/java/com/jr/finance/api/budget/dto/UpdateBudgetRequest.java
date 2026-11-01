package com.jr.finance.api.budget.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class UpdateBudgetRequest {
    @NotNull @DecimalMin(value = "0.0001", message = "El límite debe ser mayor que 0")
    @Digits(integer = 15, fraction = 4, message = "El límite admite hasta 15 enteros y 4 decimales")
    private BigDecimal limitAmount;
    @NotNull private Long version;
}
