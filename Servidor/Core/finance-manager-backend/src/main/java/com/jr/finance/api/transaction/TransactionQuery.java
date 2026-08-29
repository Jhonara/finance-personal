package com.jr.finance.api.transaction;

import com.jr.finance.api.ledger.FinancialTransactionStatus;
import com.jr.finance.api.ledger.FinancialTransactionType;
import java.time.LocalDate;

public record TransactionQuery(LocalDate from, LocalDate to, Integer year, Integer month, Long accountId,
                               Long categoryId, FinancialTransactionType type, FinancialTransactionStatus status,
                               int page, int size) { }
