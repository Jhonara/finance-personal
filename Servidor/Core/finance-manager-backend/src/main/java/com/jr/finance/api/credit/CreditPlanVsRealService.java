package com.jr.finance.api.credit;

import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.credit.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CreditPlanVsRealService {

    private final CreditRepository creditRepository;
    private final CreditPaymentRepository paymentRepository;
    private final CreditSimulationService simulationService;

    public CreditPlanVsRealResponse calculate(Long userId, Long creditId) {

        log.info("Calculando comparación plan vs. real para el crédito {} del usuario {}.",
                creditId,
                userId);

        Credit credit = creditRepository.findById(creditId)
                .orElseThrow(() -> {
                    log.warn("Crédito {} no encontrado.", creditId);
                    return new NotFoundException("El crédito no existe");
                });

        if (!credit.getUser().getId().equals(userId)) {
            log.warn("El usuario {} intentó acceder al crédito {} sin permisos.",
                    userId,
                    creditId);

            throw new NotFoundException("El crédito no existe");
        }

        List<CreditPayment> payments =
                paymentRepository.findByCreditIdOrderByPaymentDateAsc(creditId);

        // Plan teórico
        CreditSimulationRequest simulationRequest = new CreditSimulationRequest();
        simulationRequest.setPrincipal(credit.getPrincipal());
        simulationRequest.setAnnualRate(credit.getAnnualRate());
        simulationRequest.setTermMonths(credit.getTermMonths());
        simulationRequest.setDisbursementDate(credit.getDisbursementDate());
        simulationRequest.setPaymentDay(credit.getPaymentDay());

        CreditSimulationResponse simulation =
                simulationService.simulateInternal(simulationRequest);

        LocalDate today = LocalDate.now();

        BigDecimal plannedTotalPaid = BigDecimal.ZERO;
        BigDecimal plannedCapitalPaid = BigDecimal.ZERO;
        BigDecimal plannedInterestPaid = BigDecimal.ZERO;
        int plannedInstallments = 0;

        for (AmortizationRow row : simulation.getSchedule()) {

            if (!row.getDate().isAfter(today)) {

                plannedTotalPaid = plannedTotalPaid
                        .add(row.getInterest())
                        .add(row.getPrincipalPayment());

                plannedCapitalPaid = plannedCapitalPaid
                        .add(row.getPrincipalPayment());

                plannedInterestPaid = plannedInterestPaid
                        .add(row.getInterest());

                plannedInstallments++;
            }
        }

        // Pagos reales
        BigDecimal realTotalPaid = BigDecimal.ZERO;
        BigDecimal realCapitalPaid = BigDecimal.ZERO;
        BigDecimal realInterestPaid = BigDecimal.ZERO;

        BigDecimal dailyRate = simulation.getDailyRate()
                .divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP);

        BigDecimal currentBalance = credit.getPrincipal();
        LocalDate lastPaymentDate = credit.getDisbursementDate();

        for (CreditPayment payment : payments) {

            long days = ChronoUnit.DAYS.between(
                    lastPaymentDate,
                    payment.getPaymentDate()
            );

            BigDecimal interest = currentBalance
                    .multiply(dailyRate)
                    .multiply(BigDecimal.valueOf(days))
                    .setScale(2, RoundingMode.HALF_UP);

            BigDecimal capital = payment.getAmount()
                    .subtract(interest)
                    .max(BigDecimal.ZERO);

            if (payment.getExtraPayment() != null) {
                capital = capital.add(payment.getExtraPayment());
            }

            currentBalance = currentBalance
                    .subtract(capital)
                    .max(BigDecimal.ZERO);

            realInterestPaid = realInterestPaid.add(interest);
            realCapitalPaid = realCapitalPaid.add(capital);

            realTotalPaid = realTotalPaid
                    .add(payment.getAmount())
                    .add(payment.getExtraPayment() != null
                            ? payment.getExtraPayment()
                            : BigDecimal.ZERO);

            lastPaymentDate = payment.getPaymentDate();
        }

        int realInstallments = payments.size();

        String status;

        if (realInstallments > plannedInstallments) {
            status = "ADELANTADO";
        } else if (realInstallments < plannedInstallments) {
            status = "ATRASADO";
        } else {
            status = "AL_DIA";
        }

        log.info("Comparación plan vs. real calculada correctamente para el crédito {}.",
                creditId);

        return new CreditPlanVsRealResponse(
                creditId,
                plannedTotalPaid.setScale(2, RoundingMode.HALF_UP),
                realTotalPaid.setScale(2, RoundingMode.HALF_UP),
                plannedCapitalPaid.setScale(2, RoundingMode.HALF_UP),
                realCapitalPaid.setScale(2, RoundingMode.HALF_UP),
                plannedInterestPaid.setScale(2, RoundingMode.HALF_UP),
                realInterestPaid.setScale(2, RoundingMode.HALF_UP),
                currentBalance.setScale(2, RoundingMode.HALF_UP),
                plannedInstallments,
                realInstallments,
                status
        );
    }
}