package com.jr.finance.api.saving.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record AssignSavingCurrencyRequest(
        @NotBlank @Pattern(regexp = "[A-Z]{3}") String currency) {}
