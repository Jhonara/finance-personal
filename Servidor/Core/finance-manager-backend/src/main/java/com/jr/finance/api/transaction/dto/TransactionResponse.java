package com.jr.finance.api.transaction.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record TransactionResponse(Long id, String type, String status, LocalDate effectiveDate, LocalDateTime createdAt,
                                  String description, BigDecimal amount, String currency, Long categoryId,
                                  String categoryName, Long accountId, String accountName, Long sourceAccountId,
                                  String sourceAccountName, Long destinationAccountId, String destinationAccountName,
                                  Long reversalOfId) { }
