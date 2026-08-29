package com.jr.finance.api.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDate;

@Schema(
        name = "DashboardCreditResponse",
        description = "Resumen básico de un crédito registrado por el usuario."
)
public record DashboardCreditResponse(
        Long id,
        String name,
        BigDecimal principal,
        BigDecimal annualRate,
        Integer termMonths,
        LocalDate disbursementDate,
        Integer paymentDay
) {
}
