package com.jr.finance.api.credit;

import com.jr.finance.api.common.exception.BadRequestException;
import com.jr.finance.api.credit.dto.AmortizationRow;
import com.jr.finance.api.credit.dto.CreditAmortizationPaymentRow;
import com.jr.finance.api.credit.dto.CreditAmortizationResponse;
import com.jr.finance.api.credit.dto.CreditAmortizationScenarioRequest;
import com.jr.finance.api.credit.dto.CreditAmortizationScenarioResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CreditAmortizationOverviewService {
    private static final int MAX_PROJECTION_INSTALLMENTS = 1200;
    private static final String NO_PROJECTION = "La cuota pactada no alcanza para amortizar el saldo con la tasa actual.";

    private final CreditService credits;
    private final CreditPaymentRepository payments;
    private final CreditAmortizationService amortization;

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public CreditAmortizationResponse overview(Long userId, Long creditId) {
        Credit credit = credits.findByIdForUser(userId, creditId);
        List<CreditPayment> posted = postedPayments(creditId);
        BigDecimal balance = credit.trackingPrincipal().setScale(2, RoundingMode.HALF_UP);
        BigDecimal recordedExtra = BigDecimal.ZERO;
        List<CreditAmortizationPaymentRow> history = new ArrayList<>();
        for (CreditPayment payment : posted) {
            BigDecimal extra = zeroIfNull(payment.getExtraPrincipalAmount());
            recordedExtra = recordedExtra.add(extra);
            balance = balance.subtract(payment.getPrincipalAmount()).subtract(extra)
                    .max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
            history.add(new CreditAmortizationPaymentRow(payment.getId(), payment.getPaymentDate(),
                    payment.getTotalAmount(), payment.getInterestAmount(), payment.getPrincipalAmount(),
                    extra, balance));
        }

        BigDecimal monthlyRate = amortization.monthlyRate(credit.getAnnualRate());
        BigDecimal fixedPayment = amortization.fixedPayment(credit.getPrincipal(), monthlyRate,
                credit.getTermMonths());
        Projection original = project(credit, credit.getPrincipal(), monthlyRate, fixedPayment, 1,
                Math.min(credit.getTermMonths(), MAX_PROJECTION_INSTALLMENTS), Map.of());
        fixedPayment = amortization.fixedPayment(credit.trackingPrincipal(), monthlyRate, credit.trackingMonths());
        int next = nextInstallment(credit, LocalDate.now());
        Projection remaining = balance.signum() == 0 ? new Projection(List.of(), null)
                : project(credit, balance, monthlyRate, fixedPayment, next,
                        MAX_PROJECTION_INSTALLMENTS, Map.of());
        Projection withoutRecordedExtras = recordedExtra.signum() == 0 ? remaining
                : project(credit, balance.add(recordedExtra), monthlyRate, fixedPayment, next,
                        MAX_PROJECTION_INSTALLMENTS, Map.of());
        boolean canCompareRecorded = remaining.warning() == null && withoutRecordedExtras.warning() == null;
        Integer savedByRecorded = canCompareRecorded
                ? Math.max(0, withoutRecordedExtras.rows().size() - remaining.rows().size()) : null;
        BigDecimal interestSavedByRecorded = canCompareRecorded
                ? interestTotal(withoutRecordedExtras.rows()).subtract(interestTotal(remaining.rows()))
                        .max(BigDecimal.ZERO) : null;

        return new CreditAmortizationResponse(credit.getId(), credit.getCurrency(), credit.getPrincipal(),
                credit.getAnnualRate(), credit.getTermMonths(), credit.getDisbursementDate(),
                credit.getPaymentDay(), monthlyRate.multiply(BigDecimal.valueOf(100)).setScale(6, RoundingMode.HALF_UP),
                fixedPayment, balance, next, recordedExtra, savedByRecorded, interestSavedByRecorded,
                history, original.rows(), remaining.rows(),
                interestTotal(remaining.rows()), payoffDate(remaining.rows()), remaining.warning());
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public CreditAmortizationScenarioResponse scenario(Long userId, Long creditId,
                                                          CreditAmortizationScenarioRequest request) {
        CreditAmortizationResponse current = overview(userId, creditId);
        if (current.currentBalance().signum() == 0)
            throw new BadRequestException("Este crédito ya está pagado");
        if (current.projectionWarning() != null)
            throw new BadRequestException("No se puede comparar un abono sin una proyección base válida");

        List<CreditAmortizationScenarioRequest.Contribution> contributions = request.contributions();
        if (contributions == null) {
            if (request.installment() == null || request.extraAmount() == null)
                throw new BadRequestException("Añade al menos un abono al escenario");
            contributions = List.of(new CreditAmortizationScenarioRequest.Contribution(request.installment(), request.extraAmount()));
        } else if (request.installment() != null || request.extraAmount() != null) {
            throw new BadRequestException("Usa la lista de abonos o un abono individual, no ambos");
        }
        if (contributions.isEmpty() || contributions.size() > MAX_PROJECTION_INSTALLMENTS)
            throw new BadRequestException("Añade abonos dentro de las cuotas disponibles");
        java.util.TreeMap<Integer, BigDecimal> extras = new java.util.TreeMap<>();
        for (var item : contributions) {
            if (item == null || item.installment() == null || item.amount() == null || item.amount().signum() <= 0)
                throw new BadRequestException("Cada abono necesita una cuota y un importe positivo");
            if (extras.putIfAbsent(item.installment(), item.amount()) != null)
                throw new BadRequestException("Combina los importes de la cuota " + item.installment() + " en un solo abono");
            if (current.projectedSchedule().stream().noneMatch(row -> row.getInstallment() == item.installment()))
                throw new BadRequestException("La cuota " + item.installment() + " no está en la proyección actual");
        }
        Credit credit = credits.findByIdForUser(userId, creditId);
        BigDecimal rate = amortization.monthlyRate(credit.getAnnualRate());
        BigDecimal balance = current.currentBalance();
        BigDecimal payment = current.contractualInstallment();
        BigDecimal paymentAfterExtra = payment;
        List<AmortizationRow> rows = new ArrayList<>();
        int baselineCount = current.projectedSchedule().size();
        int applied = 0;
        for (int offset = 0; offset < baselineCount && balance.signum() > 0; offset++) {
            int number = current.nextInstallment() + offset;
            BigDecimal interest = balance.multiply(rate).setScale(2, RoundingMode.HALF_UP);
            BigDecimal principal = payment.subtract(interest).max(BigDecimal.ZERO).min(balance);
            if (offset == baselineCount - 1 || balance.subtract(principal).compareTo(
                    new BigDecimal("0.01").multiply(BigDecimal.valueOf(credit.getTermMonths()))) <= 0) principal = balance;
            BigDecimal extra = extras.getOrDefault(number, BigDecimal.ZERO);
            if (extra.compareTo(balance.subtract(principal)) > 0)
                throw new BadRequestException("El abono de la cuota " + number + " supera su capital disponible después de los abonos anteriores. Reduce el importe o elimina ese abono");
            BigDecimal ending = balance.subtract(principal).subtract(extra).setScale(2, RoundingMode.HALF_UP);
            rows.add(new AmortizationRow(number, credit.trackingDueDate(number), balance, 0,
                    interest, principal, ending, extra));
            balance = ending;
            if (extra.signum() > 0) {
                applied++;
                if (balance.signum() == 0) paymentAfterExtra = BigDecimal.ZERO;
                else if (request.strategy() == CreditAmortizationScenarioRequest.Strategy.REDUCE_PAYMENT) {
                    payment = amortization.fixedPayment(balance, rate, baselineCount - offset - 1);
                    paymentAfterExtra = payment;
                }
            }
        }
        if (applied != extras.size())
            throw new BadRequestException("El crédito termina antes de uno de tus abonos. Elimina los abonos posteriores al pago final y vuelve a calcular");
        BigDecimal scenarioInterest = interestTotal(rows);
        List<CreditAmortizationScenarioRequest.Contribution> sorted = extras.entrySet().stream()
                .map(entry -> new CreditAmortizationScenarioRequest.Contribution(entry.getKey(), entry.getValue())).toList();
        BigDecimal totalExtra = extras.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return new CreditAmortizationScenarioResponse(extras.firstKey(), totalExtra,
                baselineCount, rows.size(), baselineCount - rows.size(),
                current.projectedRemainingInterest(), scenarioInterest,
                current.projectedRemainingInterest().subtract(scenarioInterest).max(BigDecimal.ZERO),
                current.projectedPayoffDate(), payoffDate(rows), List.copyOf(rows),
                request.strategy(), paymentAfterExtra, sorted);
    }
    private List<CreditPayment> postedPayments(Long creditId) {
        return payments.findByCreditIdOrderByPaymentDateAsc(creditId).stream()
                .filter(payment -> payment.getStatus() == CreditPaymentStatus.POSTED)
                .sorted(Comparator.comparing(CreditPayment::getPaymentDate)
                        .thenComparing(CreditPayment::getId)).toList();
    }

    private int nextInstallment(Credit credit, LocalDate today) {
        int installment = credit.trackingFirstInstallment();
        while (installment < MAX_PROJECTION_INSTALLMENTS
                && credit.trackingDueDate(installment).isBefore(today)) installment++;
        return installment;
    }

    /** Uses the original contractual payment and the ledger-derived balance; no payment is persisted. */
    Projection project(Credit credit, BigDecimal startingBalance, BigDecimal monthlyRate,
                       BigDecimal fixedPayment, int firstInstallment, int limit,
                       Map<Integer, BigDecimal> extraByInstallment) {
        BigDecimal balance = startingBalance.setScale(2, RoundingMode.HALF_UP);
        List<AmortizationRow> rows = new ArrayList<>();
        for (int offset = 0; offset < limit && balance.signum() > 0; offset++) {
            int installment = firstInstallment + offset;
            BigDecimal interest = balance.multiply(monthlyRate, CreditAmortizationService.MC)
                    .setScale(2, RoundingMode.HALF_UP);
            BigDecimal regular = fixedPayment.subtract(interest);
            if (regular.signum() <= 0) return new Projection(List.of(), NO_PROJECTION);
            regular = regular.min(balance);
            // Settle accumulated cent rounding in the last payment instead of creating
            // a separate installment for a few cents (also applies to a zero-rate loan).
            BigDecimal roundingAllowance = new BigDecimal("0.01")
                    .multiply(BigDecimal.valueOf(credit.getTermMonths()));
            if (balance.subtract(regular).compareTo(roundingAllowance) <= 0) regular = balance;
            // Round-off from the fixed installment belongs in the final contractual payment,
            // never in interest or in a fictitious extra contribution.
            if (firstInstallment == 1 && limit == credit.getTermMonths() && offset == limit - 1)
                regular = balance;
            BigDecimal extra = extraByInstallment.getOrDefault(installment, BigDecimal.ZERO)
                    .min(balance.subtract(regular)).setScale(2, RoundingMode.HALF_UP);
            BigDecimal ending = balance.subtract(regular).subtract(extra).setScale(2, RoundingMode.HALF_UP);
            rows.add(new AmortizationRow(installment,
                    firstInstallment == 1 && limit == credit.getTermMonths()
                            ? amortization.dueDate(credit.getDisbursementDate(), installment, credit.getPaymentDay())
                            : credit.trackingDueDate(installment),
                    balance, 0, interest, regular, ending, extra));
            balance = ending;
        }
        return balance.signum() > 0
                ? new Projection(List.of(), "El plazo de proyección disponible no alcanza para cancelar el saldo.")
                : new Projection(List.copyOf(rows), null);
    }

    private static BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private static BigDecimal interestTotal(List<AmortizationRow> rows) {
        return rows.stream().map(AmortizationRow::getInterest).reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private static LocalDate payoffDate(List<AmortizationRow> rows) {
        return rows.isEmpty() ? null : rows.getLast().getDate();
    }

    record Projection(List<AmortizationRow> rows, String warning) { }
}
