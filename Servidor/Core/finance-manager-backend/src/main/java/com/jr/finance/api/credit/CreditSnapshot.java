package com.jr.finance.api.credit;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreditSnapshot(BigDecimal remainingBalance, BigDecimal paidPrincipal, BigDecimal paidInterest,
                             CreditStatus status, LocalDate nextPaymentDate, BigDecimal expectedPaymentAmount) { }
