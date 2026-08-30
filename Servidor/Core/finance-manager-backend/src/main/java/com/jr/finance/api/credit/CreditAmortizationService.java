package com.jr.finance.api.credit;

import com.jr.finance.api.credit.dto.AmortizationRow;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Single source of truth for EA conversion, fixed-payment calculation and schedules. */
@Service
public class CreditAmortizationService {
    public static final MathContext MC = MathContext.DECIMAL64;
    public static final int MONEY_SCALE = 2;

    public BigDecimal monthlyRate(BigDecimal annualEffectiveRatePercent) {
        BigDecimal annual = annualEffectiveRatePercent.divide(BigDecimal.valueOf(100), MC);
        if (annual.signum() == 0) return BigDecimal.ZERO;
        // Fractional exponent is isolated here; persisted monetary values remain BigDecimal.
        return BigDecimal.valueOf(Math.pow(BigDecimal.ONE.add(annual).doubleValue(), 1d / 12d) - 1d)
                .setScale(16, RoundingMode.HALF_UP);
    }

    public BigDecimal fixedPayment(BigDecimal principal, BigDecimal monthlyRate, int termMonths) {
        if (monthlyRate.signum() == 0) {
            return principal.divide(BigDecimal.valueOf(termMonths), MONEY_SCALE, RoundingMode.HALF_UP);
        }
        BigDecimal factor = BigDecimal.valueOf(Math.pow(BigDecimal.ONE.add(monthlyRate).doubleValue(), -termMonths));
        return principal.multiply(monthlyRate, MC)
                .divide(BigDecimal.ONE.subtract(factor, MC), MC)
                .setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    }

    public List<AmortizationRow> schedule(BigDecimal principal, BigDecimal annualRate, int termMonths,
                                          LocalDate disbursementDate, int paymentDay,
                                          Map<Integer, BigDecimal> extraByInstallment) {
        BigDecimal rate = monthlyRate(annualRate);
        BigDecimal payment = fixedPayment(principal, rate, termMonths);
        BigDecimal balance = principal.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
        List<AmortizationRow> rows = new ArrayList<>();
        for (int number = 1; number <= termMonths && balance.signum() > 0; number++) {
            LocalDate due = dueDate(disbursementDate, number, paymentDay);
            BigDecimal interest = balance.multiply(rate, MC).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
            BigDecimal regularPrincipal = payment.subtract(interest).max(BigDecimal.ZERO);
            BigDecimal extra = extraByInstallment == null ? BigDecimal.ZERO
                    : extraByInstallment.getOrDefault(number, BigDecimal.ZERO).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
            BigDecimal maxPrincipal = balance;
            if (regularPrincipal.add(extra).compareTo(maxPrincipal) > 0) {
                regularPrincipal = maxPrincipal.subtract(extra).max(BigDecimal.ZERO);
                extra = maxPrincipal.subtract(regularPrincipal);
                interest = payment.subtract(regularPrincipal).max(BigDecimal.ZERO).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
            }
            BigDecimal ending = balance.subtract(regularPrincipal).subtract(extra).max(BigDecimal.ZERO)
                    .setScale(MONEY_SCALE, RoundingMode.HALF_UP);
            rows.add(new AmortizationRow(number, due, balance, 0, interest, regularPrincipal, ending, extra));
            balance = ending;
        }
        return rows;
    }

    public LocalDate dueDate(LocalDate disbursementDate, int installmentNumber, int paymentDay) {
        LocalDate candidate = disbursementDate.plusMonths(installmentNumber);
        return candidate.withDayOfMonth(Math.min(paymentDay, candidate.lengthOfMonth()));
    }
}
