package com.jr.finance.api.credit.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;

public record SetCreditOpeningRequest(
        @NotNull Long version,
        @NotNull @Positive @jakarta.validation.constraints.Digits(integer = 17, fraction = 2) BigDecimal openingBalance,
        @NotNull @PastOrPresent LocalDate openingDate,
        @NotNull @Min(1) @Max(1200) Integer openingRemainingMonths,
        @NotNull LocalDate openingNextPaymentDate
) { }
