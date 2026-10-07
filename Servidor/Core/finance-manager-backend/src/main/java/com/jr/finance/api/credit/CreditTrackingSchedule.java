package com.jr.finance.api.credit;

import com.jr.finance.api.credit.dto.AmortizationRow;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/** Baseline from an explicitly confirmed statement; prior payments are not fabricated. */
public final class CreditTrackingSchedule {
    private CreditTrackingSchedule() { }
    public static List<AmortizationRow> build(Credit credit, CreditAmortizationService calculator) {
        if (credit.getOpeningBalance() == null) return calculator.schedule(credit.getPrincipal(),
                credit.getAnnualRate(), credit.getTermMonths(), credit.getDisbursementDate(), credit.getPaymentDay(), null);
        BigDecimal rate = calculator.monthlyRate(credit.getAnnualRate());
        BigDecimal payment = calculator.fixedPayment(credit.trackingPrincipal(), rate, credit.trackingMonths());
        BigDecimal balance = credit.trackingPrincipal();
        List<AmortizationRow> rows = new ArrayList<>();
        for (int offset = 0; offset < credit.trackingMonths() && balance.signum() > 0; offset++) {
            int number = credit.trackingFirstInstallment() + offset;
            BigDecimal interest = balance.multiply(rate).setScale(2, RoundingMode.HALF_UP);
            BigDecimal principal = offset == credit.trackingMonths() - 1 ? balance
                    : payment.subtract(interest).max(BigDecimal.ZERO).min(balance);
            BigDecimal ending = balance.subtract(principal);
            rows.add(new AmortizationRow(number, credit.trackingDueDate(number), balance, 0,
                    interest, principal, ending, BigDecimal.ZERO));
            balance = ending;
        }
        return rows;
    }
}
