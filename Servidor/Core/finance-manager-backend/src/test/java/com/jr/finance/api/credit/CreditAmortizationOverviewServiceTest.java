package com.jr.finance.api.credit;

import com.jr.finance.api.common.exception.BadRequestException;
import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.credit.dto.CreditAmortizationScenarioRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CreditAmortizationOverviewServiceTest {
    private final CreditService credits = mock(CreditService.class);
    private final CreditPaymentRepository payments = mock(CreditPaymentRepository.class);
    private final CreditAmortizationOverviewService service =
            new CreditAmortizationOverviewService(credits, payments, new CreditAmortizationService());
    private Credit credit;

    @BeforeEach
    void prepare() {
        credit = new Credit();
        credit.setId(7L);
        credit.setName("Crédito de casa");
        credit.setPrincipal(new BigDecimal("1000.00"));
        credit.setAnnualRate(new BigDecimal("12.00"));
        credit.setTermMonths(12);
        credit.setDisbursementDate(LocalDate.now().minusMonths(2));
        credit.setPaymentDay(15);
        credit.setCurrency("COP");
        when(credits.findByIdForUser(42L, 7L)).thenReturn(credit);
        when(payments.findByCreditIdOrderByPaymentDateAsc(7L)).thenReturn(List.of());
    }

    @Test
    void usesPostedPaymentsOnlyAndProjectsFromTheirRealBalance() {
        CreditPayment posted = payment(1L, CreditPaymentStatus.POSTED, "200", "20", "130", "50");
        CreditPayment reversed = payment(2L, CreditPaymentStatus.REVERSED, "400", "0", "300", "100");
        when(payments.findByCreditIdOrderByPaymentDateAsc(7L)).thenReturn(List.of(reversed, posted));

        var overview = service.overview(42L, 7L);

        assertThat(overview.currentBalance()).isEqualByComparingTo("820.00");
        assertThat(overview.payments()).hasSize(1);
        assertThat(overview.payments().getFirst().extraPrincipalAmount()).isEqualByComparingTo("50");
        assertThat(overview.recordedExtraTotal()).isEqualByComparingTo("50");
        assertThat(overview.installmentsSavedByRecordedExtras()).isNotNegative();
        assertThat(overview.interestSavedByRecordedExtras()).isPositive();
        assertThat(overview.payments().getFirst().balanceAfter()).isEqualByComparingTo("820.00");
        assertThat(overview.originalSchedule()).hasSize(12);
        assertThat(overview.originalSchedule().getLast().getPrincipalPayment())
                .isEqualByComparingTo(overview.originalSchedule().getLast().getOpeningBalance());
        assertThat(overview.originalSchedule().getLast().getExtraPayment()).isEqualByComparingTo("0");
        assertThat(overview.projectedSchedule()).isNotEmpty();
        assertThat(overview.projectedSchedule().getFirst().getOpeningBalance()).isEqualByComparingTo("820.00");
        assertThat(overview.projectedSchedule().getLast().getEndingBalance()).isEqualByComparingTo("0.00");
        assertThat(overview.projectedSchedule().getFirst().getDate()).isAfterOrEqualTo(LocalDate.now());
        assertThat(overview.projectionWarning()).isNull();
    }

    @Test
    void comparesOneFutureContributionWithoutPersistingIt() {
        var base = service.overview(42L, 7L);
        int installment = base.projectedSchedule().getFirst().getInstallment();

        var scenario = service.scenario(42L, 7L,
                new CreditAmortizationScenarioRequest(installment, new BigDecimal("300.00")));

        assertThat(scenario.scenarioRemainingInstallments())
                .isLessThan(scenario.baselineRemainingInstallments());
        assertThat(scenario.savedInstallments()).isPositive();
        assertThat(scenario.interestSaved()).isPositive();
        assertThat(scenario.schedule().getFirst().getExtraPayment()).isEqualByComparingTo("300.00");
        assertThat(scenario.schedule().getLast().getEndingBalance()).isEqualByComparingTo("0.00");
        verify(payments, never()).saveAndFlush(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void reducesMonthlyPaymentAfterChosenInstallmentWhileKeepingPayoffDate() {
        var base = service.overview(42L, 7L);
        int installment = base.projectedSchedule().get(2).getInstallment();
        var scenario = service.scenario(42L, 7L, new CreditAmortizationScenarioRequest(
                installment, new BigDecimal("300.00"),
                CreditAmortizationScenarioRequest.Strategy.REDUCE_PAYMENT));

        assertThat(scenario.scenarioPayoffDate()).isEqualTo(base.projectedPayoffDate());
        assertThat(scenario.savedInstallments()).isZero();
        assertThat(scenario.monthlyPaymentAfterExtra()).isPositive().isLessThan(base.contractualInstallment());
        assertThat(scenario.interestSaved()).isPositive();
        assertThat(scenario.schedule().getFirst().getEndingBalance())
                .isEqualByComparingTo(base.projectedSchedule().getFirst().getEndingBalance());
        BigDecimal principal = scenario.schedule().stream()
                .map(row -> row.getPrincipalPayment().add(row.getExtraPayment()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(principal).isEqualByComparingTo(base.currentBalance());
        assertThat(scenario.schedule().getLast().getEndingBalance()).isZero();
    }

    @Test
    void supportsZeroRateAndFullPayoffForBothStrategies() {
        credit.setAnnualRate(BigDecimal.ZERO);
        var base = service.overview(42L, 7L);
        assertThat(base.projectedSchedule()).hasSize(12);
        var first = base.projectedSchedule().getFirst();
        for (var strategy : CreditAmortizationScenarioRequest.Strategy.values()) {
            var result = service.scenario(42L, 7L, new CreditAmortizationScenarioRequest(
                    first.getInstallment(), first.getEndingBalance(), strategy));
            assertThat(result.schedule()).hasSize(1);
            assertThat(result.schedule().getFirst().getEndingBalance()).isZero();
            assertThat(result.monthlyPaymentAfterExtra()).isZero();
            assertThat(result.interestSaved()).isZero();
        }
    }

    @Test
    void rejectsAContributionBeyondAvailableCapitalOrAfterPayoff() {
        var base = service.overview(42L, 7L);
        int installment = base.projectedSchedule().getFirst().getInstallment();
        assertThatThrownBy(() -> service.scenario(42L, 7L,
                new CreditAmortizationScenarioRequest(installment, new BigDecimal("9999"))))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.scenario(42L, 7L,
                new CreditAmortizationScenarioRequest(9999, new BigDecimal("1"))))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void appliesMultipleContributionsSequentiallyForBothStrategies() {
        var base = service.overview(42L, 7L);
        int first = base.nextInstallment();
        for (var strategy : CreditAmortizationScenarioRequest.Strategy.values()) {
            var scenario = service.scenario(42L, 7L, new CreditAmortizationScenarioRequest(null, null, strategy,
                    List.of(new CreditAmortizationScenarioRequest.Contribution(first + 2, new BigDecimal("100")),
                            new CreditAmortizationScenarioRequest.Contribution(first, new BigDecimal("100")))));
            assertThat(scenario.contributions()).hasSize(2);
            assertThat(scenario.extraAmount()).isEqualByComparingTo("200");
            assertThat(scenario.schedule().stream().filter(row -> row.getExtraPayment().signum() > 0)).hasSize(2);
            assertThat(scenario.interestSaved()).isPositive();
            assertThat(scenario.schedule().getLast().getEndingBalance()).isZero();
            assertThat(scenario.schedule().stream().map(row -> row.getPrincipalPayment().add(row.getExtraPayment()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add)).isEqualByComparingTo("1000");
            if (strategy == CreditAmortizationScenarioRequest.Strategy.REDUCE_PAYMENT)
                assertThat(scenario.scenarioPayoffDate()).isEqualTo(base.projectedPayoffDate());
        }
    }

    @Test
    void rejectsDuplicateOrUnreachableContributionsInsteadOfSilentlyDroppingThem() {
        var base = service.overview(42L, 7L);
        int first = base.nextInstallment();
        var full = new CreditAmortizationScenarioRequest.Contribution(first, base.projectedSchedule().getFirst().getEndingBalance());
        assertThatThrownBy(() -> service.scenario(42L, 7L, new CreditAmortizationScenarioRequest(null, null, null,
                List.of(full, full)))).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.scenario(42L, 7L, new CreditAmortizationScenarioRequest(null, null, null,
                List.of(full, new CreditAmortizationScenarioRequest.Contribution(first + 1, BigDecimal.TEN)))))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("termina antes");
    }

    @Test
    void importsAnExistingLoanWithoutInventingPastPaymentsOrDebt() {
        credit.setDisbursementDate(LocalDate.now().minusYears(1));
        credit.setOpeningBalance(new BigDecimal("400"));
        credit.setOpeningDate(LocalDate.now());
        credit.setOpeningRemainingMonths(5);
        credit.setOpeningNextPaymentDate(LocalDate.now().plusDays(12));
        var result = service.overview(42L, 7L);
        assertThat(result.currentBalance()).isEqualByComparingTo("400");
        assertThat(result.payments()).isEmpty();
        assertThat(result.nextInstallment()).isEqualTo(8);
        assertThat(result.projectedSchedule()).hasSize(5);
        assertThat(result.projectedSchedule().getFirst().getDate()).isEqualTo(credit.getOpeningNextPaymentDate());
    }

    @Test
    void checksOwnershipBeforeReadingAnyPayment() {
        when(credits.findByIdForUser(99L, 7L)).thenThrow(new NotFoundException("El crédito no existe"));
        assertThatThrownBy(() -> service.overview(99L, 7L)).isInstanceOf(NotFoundException.class);
        verify(payments, never()).findByCreditIdOrderByPaymentDateAsc(7L);
    }

    private CreditPayment payment(Long id, CreditPaymentStatus status, String total,
                                  String interest, String principal, String extra) {
        CreditPayment payment = new CreditPayment();
        payment.setId(id);
        payment.setCredit(credit);
        payment.setPaymentDate(LocalDate.now().minusDays(2));
        payment.setTotalAmount(new BigDecimal(total));
        payment.setInterestAmount(new BigDecimal(interest));
        payment.setPrincipalAmount(new BigDecimal(principal));
        payment.setExtraPrincipalAmount(new BigDecimal(extra));
        payment.setStatus(status);
        return payment;
    }
}
