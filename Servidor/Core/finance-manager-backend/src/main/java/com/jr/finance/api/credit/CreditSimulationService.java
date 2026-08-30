package com.jr.finance.api.credit;

import com.jr.finance.api.common.exception.BadRequestException;
import com.jr.finance.api.credit.dto.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
public class CreditSimulationService {
    private final CreditAmortizationService amortization;

    public CreditSimulationService(CreditAmortizationService amortization) { this.amortization = amortization; }

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

        BigDecimal monthlyRate = amortization.monthlyRate(req.getAnnualRate());
        BigDecimal installment = amortization.fixedPayment(req.getPrincipal(), monthlyRate, req.getTermMonths());
        List<AmortizationRow> rows = amortization.schedule(req.getPrincipal(), req.getAnnualRate(), req.getTermMonths(),
                req.getDisbursementDate(), req.getPaymentDay(), req.getExtraPayments());
        int lastPaidInstallment = Optional.ofNullable(req.getCurrentInstallment()).orElse(0);
        LocalDate today = Optional.ofNullable(req.getToday()).orElse(LocalDate.now());
        AmortizationRow paid = lastPaidInstallment == 0 ? null : rows.stream()
                .filter(row -> row.getInstallment() == lastPaidInstallment).findFirst().orElse(null);
        BigDecimal balanceAfterLastPayment = paid == null ? req.getPrincipal() : paid.getEndingBalance();
        LocalDate lastPaymentDate = paid == null ? req.getDisbursementDate() : paid.getDate();
        int remainingInstallments = (int) rows.stream().filter(row -> row.getInstallment() > lastPaidInstallment).count();
        int savedInstallments = req.getTermMonths() - rows.size();
        long daysSinceLastPayment = Math.max(ChronoUnit.DAYS.between(lastPaymentDate, today), 0);
        BigDecimal interestToday = BigDecimal.ZERO;
        BigDecimal totalToPayToday = balanceAfterLastPayment.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalInterest = rows.stream().map(AmortizationRow::getInterest).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalPaid = rows.stream().map(row -> row.getInterest().add(row.getPrincipalPayment()).add(row.getExtraPayment()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new CreditSimulationResponse(
                monthlyRate.multiply(BigDecimal.valueOf(100)).setScale(6, RoundingMode.HALF_UP),
                BigDecimal.ZERO.setScale(6),
                installment,
                remainingInstallments,
                Math.max(savedInstallments, 0),
                balanceAfterLastPayment,
                Math.max(daysSinceLastPayment, 0),
                interestToday,
                totalToPayToday, totalInterest.setScale(2, RoundingMode.HALF_UP), totalPaid.setScale(2, RoundingMode.HALF_UP), rows
        );
    }
}
