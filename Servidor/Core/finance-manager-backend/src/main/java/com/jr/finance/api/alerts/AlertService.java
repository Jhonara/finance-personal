package com.jr.finance.api.alerts;

import com.jr.finance.api.alerts.dto.AlertResponse;
import com.jr.finance.api.credit.*;
import com.jr.finance.api.credit.dto.CreditPlanVsRealResponse;
import com.jr.finance.api.expense.ExpenseService;
import com.jr.finance.api.expense.dto.MonthComparisonResponse;
import com.jr.finance.api.user.User;
import com.jr.finance.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AlertService {

    private final UserRepository userRepository;
    private final CreditRepository creditRepository;
    private final CreditPlanVsRealService planVsRealService;
    private final CreditSimulationService simulationService;
    private final ExpenseService expenseService;
    private final UserAlertSeenRepository seenRepository;

    public List<AlertResponse> buildAlerts(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<AlertResponse> alerts = new ArrayList<>();

        // Créditos
        var credits = creditRepository.findByUserId(userId);
        for (Credit c : credits) {
            CreditPlanVsRealResponse pvr = planVsRealService.calculate(userId, c.getId());

            if ("ATRASADO".equals(pvr.getStatus())) {
                addIfNotSeen(alerts, userId, "CREDIT_BEHIND", c.getId(),
                        new AlertResponse(
                                "CREDIT_BEHIND", "WARNING", 90,
                                "Vas atrasado en el crédito #" + c.getId() + ". Revisa tus pagos.",
                                Map.of("creditId", c.getId(), "status", pvr.getStatus())
                        ));
            }

            if (pvr.getRealInterestPaid().compareTo(
                    pvr.getPlannedInterestPaid().multiply(BigDecimal.valueOf(1.10))) > 0) {
                addIfNotSeen(alerts, userId, "HIGH_INTEREST", c.getId(),
                        new AlertResponse(
                                "HIGH_INTEREST", "WARNING", 70,
                                "Estás pagando más interés de lo esperado en el crédito #" + c.getId() + ".",
                                Map.of("creditId", c.getId(),
                                        "realInterest", pvr.getRealInterestPaid(),
                                        "plannedInterest", pvr.getPlannedInterestPaid())
                        ));
            }

            var simReq = new com.jr.finance.api.credit.dto.CreditSimulationRequest();
            simReq.setPrincipal(c.getPrincipal());
            simReq.setAnnualRate(c.getAnnualRate());
            simReq.setTermMonths(c.getTermMonths());
            simReq.setDisbursementDate(c.getDisbursementDate());
            simReq.setPaymentDay(c.getPaymentDay());

            var sim = simulationService.simulateInternal(simReq);
            if (sim.getSavedInstallments() >= 1) {
                addIfNotSeen(alerts, userId, "OPPORTUNITY_PREPAY", c.getId(),
                        new AlertResponse(
                                "OPPORTUNITY_PREPAY", "TIP", 30,
                                "Podrías ahorrar cuotas en el crédito #" + c.getId() + " si haces un abono extra.",
                                Map.of("creditId", c.getId(), "savedInstallments", sim.getSavedInstallments())
                        ));
            }
        }

        // Gastos
        YearMonth now = YearMonth.now();
        MonthComparisonResponse cmp = expenseService.compareMonth(userId, now.getYear(), now.getMonthValue());

        if (cmp.getPercentageChange() != null &&
                cmp.getPercentageChange().compareTo(BigDecimal.valueOf(15)) > 0) {
            addIfNotSeen(alerts, userId, "SPEND_SPIKE", null,
                    new AlertResponse(
                            "SPEND_SPIKE", "WARNING", 60,
                            "Tus gastos subieron más del 15% frente al mes anterior.",
                            Map.of("differencePercent", cmp.getPercentageChange())
                    ));
        }

        if (alerts.isEmpty()) {
            alerts.add(new AlertResponse(
                    "ALL_GOOD", "INFO", 10,
                    "Todo en orden por ahora. ¡Buen manejo de tus finanzas! 👏",
                    Map.of()
            ));
        }

        alerts.sort(Comparator.comparingInt(AlertResponse::getScore).reversed());
        return alerts;
    }

    private void addIfNotSeen(List<AlertResponse> list,
                              Long userId,
                              String code,
                              Long relatedId,
                              AlertResponse alert) {

        boolean seen = seenRepository.existsByUserIdAndAlertCodeAndRelatedId(userId, code, relatedId);
        if (!seen) list.add(alert);
    }
}
