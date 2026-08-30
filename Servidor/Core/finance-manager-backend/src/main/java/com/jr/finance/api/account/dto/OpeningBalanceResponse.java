package com.jr.finance.api.account.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDate;

@Schema(name = "OpeningBalanceResponse", description = "Operación de saldo inicial creada para una cuenta.")
public record OpeningBalanceResponse(
        Long transactionId,
        Long accountId,
        String type,
        BigDecimal amount,
        String currency,
        LocalDate effectiveDate,
        String description
) {
}
