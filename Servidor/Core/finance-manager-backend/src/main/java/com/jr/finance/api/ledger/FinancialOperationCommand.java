package com.jr.finance.api.ledger;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Internal command; it is intentionally not an HTTP request DTO. */
public record FinancialOperationCommand(
        BigDecimal amount,
        LocalDate effectiveDate,
        String description,
        String currency,
        Long categoryId
) {
}
