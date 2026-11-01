package com.jr.finance.api.saving.dto;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
public record UpdateSavingGoalRequest(@NotBlank @Size(max = 100) String name, @Size(max = 500) String description,
        @NotNull @Positive @Digits(integer = 15, fraction = 4) BigDecimal targetAmount, LocalDate targetDate,
        @NotNull @PositiveOrZero Long version) { }
