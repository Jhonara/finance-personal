package com.jr.finance.api.budget.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateBudgetRequest {
    @NotNull private Long categoryId;
    @NotNull private Integer year;
    @NotNull private Integer month;
    @NotNull @DecimalMin(value = "0.0001", message = "El límite debe ser mayor que 0")
    private BigDecimal limitAmount;
}
