package com.jr.finance.api.credit;

import com.jr.finance.api.credit.dto.AmortizationRow;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CreditSnapshotService {
    private final CreditPaymentRepository payments;
    private final CreditAmortizationService amortization;

    public CreditSnapshot snapshot(Credit credit) {
        List<CreditPayment> all = payments.findByCreditIdOrderByPaymentDateAsc(credit.getId()).stream()
                .filter(payment -> payment.getStatus() == CreditPaymentStatus.POSTED).toList();
        BigDecimal paidPrincipal = all.stream().map(p -> p.getPrincipalAmount().add(p.getExtraPrincipalAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal paidInterest = all.stream().map(CreditPayment::getInterestAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal balance = credit.trackingPrincipal().subtract(paidPrincipal).max(BigDecimal.ZERO)
                .setScale(CreditAmortizationService.MONEY_SCALE, java.math.RoundingMode.HALF_UP);
        if (balance.signum() == 0) return new CreditSnapshot(balance, paidPrincipal, paidInterest, CreditStatus.PAID, null, BigDecimal.ZERO, BigDecimal.ZERO);
        List<AmortizationRow> schedule = CreditTrackingSchedule.build(credit, amortization);
        LocalDate today = LocalDate.now();
        BigDecimal requiredToDate = schedule.stream().filter(row -> row.getDate().isBefore(today))
                .map(row -> row.getInterest().add(row.getPrincipalPayment())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal paidToDate = all.stream().filter(p -> !p.getPaymentDate().isAfter(today))
                .map(p -> p.getTotalAmount().subtract(p.getExtraPrincipalAmount())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal overdue = requiredToDate.subtract(paidToDate).max(BigDecimal.ZERO).setScale(2, java.math.RoundingMode.HALF_UP);
        CreditStatus status = paidToDate.add(new BigDecimal("0.01")).compareTo(requiredToDate) < 0 ? CreditStatus.LATE : CreditStatus.ACTIVE;
        LocalDate next = schedule.stream().map(AmortizationRow::getDate).filter(date -> !date.isBefore(today)).findFirst()
                .orElse(credit.trackingDueDate(credit.getTermMonths()));
        BigDecimal expected = amortization.fixedPayment(balance, amortization.monthlyRate(credit.getAnnualRate()),
                Math.max(1, credit.trackingMonths() - all.size()));
        return new CreditSnapshot(balance, paidPrincipal, paidInterest, status, next, expected, overdue);
    }
}
