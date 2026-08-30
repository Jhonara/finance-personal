package com.jr.finance.api.credit.dto;

import com.jr.finance.api.credit.CreditStatus;
import com.jr.finance.api.credit.CreditPaymentStatus;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CreditPaymentResponse(Long paymentId, BigDecimal totalAmount, BigDecimal interestAmount,
                                    BigDecimal principalAmount, BigDecimal extraPrincipalAmount,
                                    BigDecimal previousBalance, BigDecimal newBalance,
                                    CreditStatus status, LocalDate nextPaymentDate,
                                    Long accountId, String accountName, Long financialTransactionId,
                                    CreditPaymentStatus paymentStatus) { }
