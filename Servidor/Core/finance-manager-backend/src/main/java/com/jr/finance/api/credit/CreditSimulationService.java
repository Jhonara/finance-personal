package com.jr.finance.api.credit;

import com.jr.finance.api.credit.dto.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class CreditSimulationService {

    public CreditSimulationResponse simulateInternal(CreditSimulationRequest req) {

        // Validaciones de negocio
        if (req.getExtraPayments() != null) {
            req.getExtraPayments().forEach((k, v) -> {
                if (v == null || v.compareTo(BigDecimal.ZERO) <= 0) {
                    throw new RuntimeException("Los abonos extra deben ser mayores que 0");
                }
                if (k < 1 || k > req.getTermMonths()) {
                    throw new RuntimeException("El número de cuota para abono extra es inválido: " + k);
                }
            });
        }

        return simulateCore(req);
    }

    private CreditSimulationResponse simulateCore(CreditSimulationRequest req) {

        BigDecimal EA = req.getAnnualRate().divide(BigDecimal.valueOf(100), 12, RoundingMode.HALF_UP);

        BigDecimal monthlyRate = BigDecimal.valueOf(Math.pow(1 + EA.doubleValue(), 1.0 / 12) - 1);
        BigDecimal dailyRate   = BigDecimal.valueOf(Math.pow(1 + EA.doubleValue(), 1.0 / 365) - 1);

        BigDecimal P = req.getPrincipal();
        int n = req.getTermMonths();
        BigDecimal r = monthlyRate;

        BigDecimal cuota = P.multiply(r)
                .divide(BigDecimal.ONE.subtract(
                        BigDecimal.ONE.divide(
                                BigDecimal.valueOf(Math.pow(1 + r.doubleValue(), n)),
                                12, RoundingMode.HALF_UP
                        )
                ), 2, RoundingMode.HALF_UP);

        List<AmortizationRow> rows = new ArrayList<>();

        BigDecimal saldo = P;
        LocalDate lastDate = req.getDisbursementDate();

        int lastPaidInstallment = Optional.ofNullable(req.getCurrentInstallment()).orElse(0);
        LocalDate today = Optional.ofNullable(req.getToday()).orElse(LocalDate.now());

        BigDecimal balanceAfterLastPayment = saldo;
        LocalDate lastPaymentDate = lastDate;

        int executedInstallments = 0;

        for (int i = 1; i <= n && saldo.compareTo(BigDecimal.ZERO) > 0; i++) {

            LocalDate dueDate = lastDate.plusMonths(1).withDayOfMonth(
                    Math.min(req.getPaymentDay(), lastDate.plusMonths(1).lengthOfMonth())
            );

            int days = (int) ChronoUnit.DAYS.between(lastDate, dueDate);

            BigDecimal interest = saldo.multiply(dailyRate)
                    .multiply(BigDecimal.valueOf(days))
                    .setScale(2, RoundingMode.HALF_UP);

            BigDecimal principalPayment = cuota.subtract(interest).max(BigDecimal.ZERO);

            BigDecimal extra = BigDecimal.ZERO;
            if (req.getExtraPayments() != null && req.getExtraPayments().containsKey(i)) {
                extra = req.getExtraPayments().get(i);
            }

            BigDecimal ending = saldo.subtract(principalPayment).subtract(extra).max(BigDecimal.ZERO);

            rows.add(new AmortizationRow(
                    i, dueDate, saldo, days, interest, principalPayment, ending, extra
            ));

            saldo = ending;
            lastDate = dueDate;

            if (i <= lastPaidInstallment) {
                balanceAfterLastPayment = saldo;
                lastPaymentDate = dueDate;
            }

            executedInstallments = i;
        }

        int remainingInstallments = (int) rows.stream().filter(rw -> rw.getEndingBalance().compareTo(BigDecimal.ZERO) > 0).count();
        int savedInstallments = n - rows.size();

        long daysSinceLastPayment = ChronoUnit.DAYS.between(lastPaymentDate, today);

        BigDecimal interestToday = balanceAfterLastPayment
                .multiply(dailyRate)
                .multiply(BigDecimal.valueOf(Math.max(daysSinceLastPayment, 0)))
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalToPayToday = balanceAfterLastPayment.add(interestToday).setScale(2, RoundingMode.HALF_UP);

        return new CreditSimulationResponse(
                monthlyRate.multiply(BigDecimal.valueOf(100)).setScale(6, RoundingMode.HALF_UP),
                dailyRate.multiply(BigDecimal.valueOf(100)).setScale(6, RoundingMode.HALF_UP),
                cuota,
                remainingInstallments,
                Math.max(savedInstallments, 0),
                balanceAfterLastPayment,
                Math.max(daysSinceLastPayment, 0),
                interestToday,
                totalToPayToday,
                rows
        );
    }
}
