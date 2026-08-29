package com.jr.finance.api.dashboard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DashboardRecentTransactionResponse(
        Long transactionId,
        String type,
        String status,
        LocalDate effectiveDate,
        String description,
        BigDecimal amount,
        String currency,
        Long categoryId,
        String categoryName,
        Long accountId,
        String accountName,
        Long sourceAccountId,
        String sourceAccountName,
        Long destinationAccountId,
        String destinationAccountName,
        Long reversalOfId
) {
}
