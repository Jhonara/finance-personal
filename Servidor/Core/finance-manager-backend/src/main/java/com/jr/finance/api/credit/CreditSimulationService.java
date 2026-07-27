package com.jr.finance.api.credit;

import com.jr.finance.api.common.exception.BadRequestException;
import com.jr.finance.api.credit.dto.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
public class CreditSimulationService {

    public CreditSimulationResponse simulateInternal(CreditSimulationRequest req) {

        log.info("Iniciando simulación de crédito.");

        // Validaciones de negocio
        if (req.getExtraPayments() != null) {
            req.getExtraPayments().forEach((installment, amount) -> {

                if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
                    log.warn("Se recibió un abono extra inválido para la cuota {}.", installment);
                    throw new BadRequestException("Los abonos extra deben ser mayores que 0");
                }

                if (installment < 1 || installment > req.getTermMonths()) {
                    log.warn("Número de cuota inválido para abono extra: {}.", installment);
                    throw new BadRequestException(
                            "El número de cuota para abono extra es inválido: " + installment
                    );
                }
            });
        }

        CreditSimulationResponse response = simulateCore(req);

        log.info("Simulación de crédito finalizada correctamente.");

        return response;
    }

    private CreditSimulationResponse simulateCore(CreditSimulationRequest req) {

        BigDecimal effectiveAnnualRate = req.getAnnualRate()
                .divide(BigDecimal.valueOf(100), 12, RoundingMode.HALF_UP);

        BigDecimal monthlyRate = BigDecimal.valueOf(
                Math.pow(1 + effectiveAnnualRate.doubleValue(), 1.0 / 12) - 1
        );

        BigDecimal dailyRate = BigDecimal.valueOf(
                Math.pow(1 + effectiveAnnualRate.doubleValue(), 1.0 / 365) - 1
        );

        BigDecimal principal = req.getPrincipal();
        int termMonths = req.getTermMonths();
        BigDecimal rate = monthlyRate;

        BigDecimal installment = principal.multiply(rate)
                .divide(
                        BigDecimal.ONE.subtract(
                                BigDecimal.ONE.divide(
                                        BigDecimal.valueOf(Math.pow(1 + rate.doubleValue(), termMonths)),
                                        12,
                                        RoundingMode.HALF_UP
                                )
                        ),
                        2,
                        RoundingMode.HALF_UP
                );

        List<AmortizationRow> rows = new ArrayList<>();

        BigDecimal balance = principal;
        LocalDate lastDate = req.getDisbursementDate();

        int lastPaidInstallment = Optional.ofNullable(req.getCurrentInstallment()).orElse(0);
        LocalDate today = Optional.ofNullable(req.getToday()).orElse(LocalDate.now());

        BigDecimal balanceAfterLastPayment = balance;
        LocalDate lastPaymentDate = lastDate;

        for (int installmentNumber = 1;
             installmentNumber <= termMonths && balance.compareTo(BigDecimal.ZERO) > 0;
             installmentNumber++) {

            LocalDate dueDate = lastDate.plusMonths(1)
                    .withDayOfMonth(
                            Math.min(
                                    req.getPaymentDay(),
                                    lastDate.plusMonths(1).lengthOfMonth()
                            )
                    );

            int days = (int) ChronoUnit.DAYS.between(lastDate, dueDate);

            BigDecimal interest = balance.multiply(dailyRate)
                    .multiply(BigDecimal.valueOf(days))
                    .setScale(2, RoundingMode.HALF_UP);

            BigDecimal principalPayment = installment.subtract(interest)
                    .max(BigDecimal.ZERO);

            BigDecimal extraPayment = BigDecimal.ZERO;

            if (req.getExtraPayments() != null
                    && req.getExtraPayments().containsKey(installmentNumber)) {

                extraPayment = req.getExtraPayments().get(installmentNumber);
            }

            BigDecimal endingBalance = balance
                    .subtract(principalPayment)
                    .subtract(extraPayment)
                    .max(BigDecimal.ZERO);

            rows.add(
                    new AmortizationRow(
                            installmentNumber,
                            dueDate,
                            balance,
                            days,
                            interest,
                            principalPayment,
                            endingBalance,
                            extraPayment
                    )
            );

            balance = endingBalance;
            lastDate = dueDate;

            if (installmentNumber <= lastPaidInstallment) {
                balanceAfterLastPayment = balance;
                lastPaymentDate = dueDate;
            }
        }

        int remainingInstallments = (int) rows.stream()
                .filter(row -> row.getEndingBalance().compareTo(BigDecimal.ZERO) > 0)
                .count();

        int savedInstallments = termMonths - rows.size();

        long daysSinceLastPayment = ChronoUnit.DAYS.between(lastPaymentDate, today);

        BigDecimal interestToday = balanceAfterLastPayment
                .multiply(dailyRate)
                .multiply(BigDecimal.valueOf(Math.max(daysSinceLastPayment, 0)))
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalToPayToday = balanceAfterLastPayment
                .add(interestToday)
                .setScale(2, RoundingMode.HALF_UP);

        return new CreditSimulationResponse(
                monthlyRate.multiply(BigDecimal.valueOf(100))
                        .setScale(6, RoundingMode.HALF_UP),
                dailyRate.multiply(BigDecimal.valueOf(100))
                        .setScale(6, RoundingMode.HALF_UP),
                installment,
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