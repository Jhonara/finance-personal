package com.jr.finance.api.credit;

import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.credit.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CreditPlanVsRealService {

    private final CreditRepository creditRepository;
    private final CreditPaymentRepository paymentRepository;
    private final CreditSimulationService simulationService;

    public CreditPlanVsRealResponse calculate(Long userId, Long creditId) {

        Credit credit = creditRepository.findById(creditId)
                .orElseThrow(() -> new NotFoundException("El crédito no existe"));

        if (!credit.getUser().getId().equals(userId)) {
            throw new NotFoundException("El crédito no existe");
        }

        List<CreditPayment> payments = paymentRepository.findByCreditIdOrderByPaymentDateAsc(creditId);

        // 1️⃣ Plan teórico completo
        CreditSimulationRequest planReq = new CreditSimulationRequest();
        planReq.setPrincipal(credit.getPrincipal());
        planReq.setAnnualRate(credit.getAnnualRate());
        planReq.setTermMonths(credit.getTermMonths());
        planReq.setDisbursementDate(credit.getDisbursementDate());
        planReq.setPaymentDay(credit.getPaymentDay());

        var plan = simulationService.simulateInternal(planReq);

        LocalDate today = LocalDate.now();

        BigDecimal plannedTotalToDate = BigDecimal.ZERO;
        BigDecimal plannedCapitalPaid = BigDecimal.ZERO;
        BigDecimal plannedInterestPaid = BigDecimal.ZERO;
        int plannedInstallments = 0;

        for (AmortizationRow row : plan.getSchedule()) {
            if (!row.getDate().isAfter(today)) {
                plannedTotalToDate = plannedTotalToDate.add(row.getInterest()).add(row.getPrincipalPayment());
                plannedCapitalPaid = plannedCapitalPaid.add(row.getPrincipalPayment());
                plannedInterestPaid = plannedInterestPaid.add(row.getInterest());
                plannedInstallments++;
            }
        }

        // 2️⃣ Real (pagos reales)
        BigDecimal realTotalPaid = BigDecimal.ZERO;
        BigDecimal realCapitalPaid = BigDecimal.ZERO;
        BigDecimal realInterestPaid = BigDecimal.ZERO;

        // Para calcular interés real por días
        BigDecimal dailyRate = plan.getDailyRate().divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP);

        BigDecimal balance = credit.getPrincipal();
        LocalDate lastDate = credit.getDisbursementDate();

        for (CreditPayment p : payments) {
            long days = java.time.temporal.ChronoUnit.DAYS.between(lastDate, p.getPaymentDate());

            BigDecimal interest = balance
                    .multiply(dailyRate)
                    .multiply(BigDecimal.valueOf(days))
                    .setScale(2, RoundingMode.HALF_UP);

            BigDecimal capital = p.getAmount().subtract(interest).max(BigDecimal.ZERO);

            if (p.getExtraPayment() != null) {
                capital = capital.add(p.getExtraPayment());
            }

            balance = balance.subtract(capital).max(BigDecimal.ZERO);

            realInterestPaid = realInterestPaid.add(interest);
            realCapitalPaid = realCapitalPaid.add(capital);
            realTotalPaid = realTotalPaid.add(p.getAmount()).add(p.getExtraPayment() != null ? p.getExtraPayment() : BigDecimal.ZERO);

            lastDate = p.getPaymentDate();
        }

        int realInstallments = payments.size();

        String status;
        if (realInstallments > plannedInstallments) status = "ADELANTADO";
        else if (realInstallments < plannedInstallments) status = "ATRASADO";
        else status = "AL_DIA";

        return new CreditPlanVsRealResponse(
                creditId,
                plannedTotalToDate.setScale(2, RoundingMode.HALF_UP),
                realTotalPaid.setScale(2, RoundingMode.HALF_UP),
                plannedCapitalPaid.setScale(2, RoundingMode.HALF_UP),
                realCapitalPaid.setScale(2, RoundingMode.HALF_UP),
                plannedInterestPaid.setScale(2, RoundingMode.HALF_UP),
                realInterestPaid.setScale(2, RoundingMode.HALF_UP),
                balance.setScale(2, RoundingMode.HALF_UP),
                plannedInstallments,
                realInstallments,
                status
        );
    }
}
