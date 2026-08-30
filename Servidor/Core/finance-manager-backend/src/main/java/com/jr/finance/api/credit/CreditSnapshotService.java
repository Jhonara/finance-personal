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
        BigDecimal balance = credit.getPrincipal().subtract(paidPrincipal).max(BigDecimal.ZERO)
                .setScale(CreditAmortizationService.MONEY_SCALE, java.math.RoundingMode.HALF_UP);
        if (balance.signum() == 0) return new CreditSnapshot(balance, paidPrincipal, paidInterest, CreditStatus.PAID, null, BigDecimal.ZERO);
        List<AmortizationRow> schedule = amortization.schedule(credit.getPrincipal(), credit.getAnnualRate(),
                credit.getTermMonths(), credit.getDisbursementDate(), credit.getPaymentDay(), null);
        LocalDate today = LocalDate.now();
        BigDecimal requiredToDate = schedule.stream().filter(row -> !row.getDate().isAfter(today))
                .map(row -> row.getInterest().add(row.getPrincipalPayment())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal paidToDate = all.stream().filter(p -> !p.getPaymentDate().isAfter(today))
                .map(CreditPayment::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        CreditStatus status = paidToDate.add(new BigDecimal("0.01")).compareTo(requiredToDate) < 0 ? CreditStatus.LATE : CreditStatus.ACTIVE;
        LocalDate next = schedule.stream().map(AmortizationRow::getDate).filter(date -> !date.isBefore(today)).findFirst()
                .orElse(amortization.dueDate(credit.getDisbursementDate(), credit.getTermMonths(), credit.getPaymentDay()));
        BigDecimal expected = amortization.fixedPayment(balance, amortization.monthlyRate(credit.getAnnualRate()),
                Math.max(1, credit.getTermMonths() - all.size()));
        return new CreditSnapshot(balance, paidPrincipal, paidInterest, status, next, expected);
    }
}
