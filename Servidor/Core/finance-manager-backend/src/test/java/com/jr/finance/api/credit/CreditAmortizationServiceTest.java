package com.jr.finance.api.credit;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;

class CreditAmortizationServiceTest {
    private final CreditAmortizationService service = new CreditAmortizationService();

    @Test
    void convertsEffectiveAnnualRateWithoutDividingItByTwelve() {
        BigDecimal monthly = service.monthlyRate(new BigDecimal("12.0"));
        assertThat(monthly).isCloseTo(new BigDecimal("0.00948879"), org.assertj.core.data.Offset.offset(new BigDecimal("0.00000001")));
        assertThat(monthly).isNotEqualByComparingTo(new BigDecimal("0.01"));
    }

    @Test
    void zeroRateUsesEqualPrincipalInstallmentsAndEndsAtZero() {
        BigDecimal rate = service.monthlyRate(BigDecimal.ZERO);
        assertThat(service.fixedPayment(new BigDecimal("1200"), rate, 12)).isEqualByComparingTo("100.00");
        var schedule = service.schedule(new BigDecimal("1200"), BigDecimal.ZERO, 12,
                LocalDate.of(2026, 1, 31), 31, null);
        assertThat(schedule).hasSize(12);
        assertThat(schedule.getLast().getEndingBalance()).isEqualByComparingTo("0.00");
        assertThat(schedule).allSatisfy(row -> assertThat(row.getInterest()).isEqualByComparingTo(BigDecimal.ZERO));
    }

    @Test
    void paymentDayUsesLastValidDayIncludingLeapFebruary() {
        assertThat(service.dueDate(LocalDate.of(2024, 1, 31), 1, 31)).isEqualTo(LocalDate.of(2024, 2, 29));
        assertThat(service.dueDate(LocalDate.of(2025, 1, 31), 1, 31)).isEqualTo(LocalDate.of(2025, 2, 28));
        assertThat(service.dueDate(LocalDate.of(2026, 1, 30), 1, 29)).isEqualTo(LocalDate.of(2026, 2, 28));
    }

    @Test
    void fixedPaymentScheduleHasCoherentInterestAndNoNegativeBalance() {
        List<com.jr.finance.api.credit.dto.AmortizationRow> schedule = service.schedule(new BigDecimal("1000000"),
                new BigDecimal("12"), 12, LocalDate.of(2026, 1, 15), 15, null);
        BigDecimal totalInterest = schedule.stream().map(com.jr.finance.api.credit.dto.AmortizationRow::getInterest)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(totalInterest).isPositive();
        assertThat(schedule.getLast().getEndingBalance()).isEqualByComparingTo("0.00");
        assertThat(schedule).allSatisfy(row -> assertThat(row.getEndingBalance()).isNotNegative());
    }
}
