package com.jr.finance.api.saving.dto;
import jakarta.validation.constraints.*;
import com.jr.finance.api.saving.SavingGoalStatus;
public record ChangeSavingStatusRequest(@NotNull SavingGoalStatus status, @NotNull @PositiveOrZero Long version) { }
