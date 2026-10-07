package com.jr.finance.api.credit.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Schema(description = "Historial real y proyecciones de amortización de un crédito del usuario.")
public record CreditAmortizationResponse(
        Long creditId,
        String currency,
        BigDecimal principal,
        BigDecimal annualRate,
        int termMonths,
        LocalDate disbursementDate,
        int paymentDay,
        BigDecimal monthlyRatePercent,
        BigDecimal contractualInstallment,
        BigDecimal currentBalance,
        int nextInstallment,
        BigDecimal recordedExtraTotal,
        Integer installmentsSavedByRecordedExtras,
        BigDecimal interestSavedByRecordedExtras,
        List<CreditAmortizationPaymentRow> payments,
        List<AmortizationRow> originalSchedule,
        List<AmortizationRow> projectedSchedule,
        BigDecimal projectedRemainingInterest,
        LocalDate projectedPayoffDate,
        String projectionWarning
) { }
