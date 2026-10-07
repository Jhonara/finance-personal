package com.jr.finance.api.credit.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDate;

@Schema(description = "Pago contabilizado del crédito; los pagos revertidos no se incluyen.")
public record CreditAmortizationPaymentRow(
        Long paymentId,
        LocalDate date,
        BigDecimal totalAmount,
        BigDecimal interestAmount,
        BigDecimal principalAmount,
        BigDecimal extraPrincipalAmount,
        BigDecimal balanceAfter
) { }
