package com.jr.finance.api.budget.dto;
import jakarta.validation.constraints.*;
public record BudgetStateRequest(@NotNull Boolean active, @NotNull @PositiveOrZero Long version) { }
