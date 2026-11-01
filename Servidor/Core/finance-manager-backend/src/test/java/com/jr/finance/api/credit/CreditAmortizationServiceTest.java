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

    @Test
    void earlyPayoffCapsExtraAtOutstandingPrincipalWithoutInventingInterest() {
        var schedule = service.schedule(new BigDecimal("1000"), BigDecimal.ZERO, 2,
                LocalDate.of(2026, 1, 15), 15, java.util.Map.of(1, new BigDecimal("900")));

        assertThat(schedule).hasSize(1);
        var payoff = schedule.getFirst();
        assertThat(payoff.getInterest()).isEqualByComparingTo("0.00");
        assertThat(payoff.getPrincipalPayment()).isEqualByComparingTo("500.00");
        assertThat(payoff.getExtraPayment()).isEqualByComparingTo("500.00");
        assertThat(payoff.getEndingBalance()).isEqualByComparingTo("0.00");
    }

    @Test
    void lastInstallmentPreservesAccruedInterestInsteadOfFillingTheFixedPayment() {
        BigDecimal principal = new BigDecimal("1000");
        BigDecimal rate = new BigDecimal("12");
        var schedule = service.schedule(principal, rate, 3,
                LocalDate.of(2026, 1, 15), 15, java.util.Map.of(1, new BigDecimal("500")));

        assertThat(schedule).hasSize(2);
        assertThat(schedule).allSatisfy(row -> {
            BigDecimal accrued = row.getOpeningBalance().multiply(service.monthlyRate(rate), CreditAmortizationService.MC)
                    .setScale(2, java.math.RoundingMode.HALF_UP);
            assertThat(row.getInterest()).isEqualByComparingTo(accrued);
        });
        assertThat(schedule.stream().map(row -> row.getPrincipalPayment().add(row.getExtraPayment()))
                .reduce(BigDecimal.ZERO, BigDecimal::add)).isEqualByComparingTo(principal);
        assertThat(schedule.getLast().getEndingBalance()).isEqualByComparingTo("0.00");
    }

    @Test
    void finalContractualInstallmentSettlesCentRoundingWithoutExtraInterest() {
        var schedule = service.schedule(new BigDecimal("1000"), BigDecimal.ZERO, 3,
                LocalDate.of(2026, 1, 15), 15, null);

        assertThat(schedule).hasSize(3);
        assertThat(schedule.getFirst().getPrincipalPayment()).isEqualByComparingTo("333.33");
        assertThat(schedule.getLast().getPrincipalPayment()).isEqualByComparingTo("333.34");
        assertThat(schedule.getLast().getEndingBalance()).isEqualByComparingTo("0.00");
        assertThat(schedule).allSatisfy(row -> assertThat(row.getInterest()).isZero());
    }
}
