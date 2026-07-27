package com.jr.finance.api.alerts;

import com.jr.finance.api.alerts.dto.AlertResponse;
import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.credit.Credit;
import com.jr.finance.api.credit.CreditPlanVsRealService;
import com.jr.finance.api.credit.CreditRepository;
import com.jr.finance.api.credit.CreditSimulationService;
import com.jr.finance.api.credit.dto.CreditPlanVsRealResponse;
import com.jr.finance.api.credit.dto.CreditSimulationRequest;
import com.jr.finance.api.expense.ExpenseService;
import com.jr.finance.api.expense.dto.MonthComparisonResponse;
import com.jr.finance.api.user.User;
import com.jr.finance.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Slf4j
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

        log.info("Generando alertas para el usuario {}.", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.warn("Usuario {} no encontrado al generar alertas.", userId);
                    return new NotFoundException("El usuario no existe");
                });

        List<AlertResponse> alerts = new ArrayList<>();

        // Créditos
        List<Credit> credits = creditRepository.findByUserId(userId);

        for (Credit credit : credits) {

            CreditPlanVsRealResponse planVsReal =
                    planVsRealService.calculate(userId, credit.getId());

            if ("ATRASADO".equals(planVsReal.getStatus())) {

                addIfNotSeen(
                        alerts,
                        userId,
                        "CREDIT_BEHIND",
                        credit.getId(),
                        new AlertResponse(
                                "CREDIT_BEHIND",
                                "WARNING",
                                90,
                                "Vas atrasado en el crédito #" + credit.getId() + ". Revisa tus pagos.",
                                Map.of(
                                        "creditId", credit.getId(),
                                        "status", planVsReal.getStatus()
                                )
                        )
                );
            }

            if (planVsReal.getRealInterestPaid().compareTo(
                    planVsReal.getPlannedInterestPaid().multiply(BigDecimal.valueOf(1.10))) > 0) {

                addIfNotSeen(
                        alerts,
                        userId,
                        "HIGH_INTEREST",
                        credit.getId(),
                        new AlertResponse(
                                "HIGH_INTEREST",
                                "WARNING",
                                70,
                                "Estás pagando más interés de lo esperado en el crédito #" + credit.getId() + ".",
                                Map.of(
                                        "creditId", credit.getId(),
                                        "realInterest", planVsReal.getRealInterestPaid(),
                                        "plannedInterest", planVsReal.getPlannedInterestPaid()
                                )
                        )
                );
            }

            CreditSimulationRequest simulationRequest = new CreditSimulationRequest();
            simulationRequest.setPrincipal(credit.getPrincipal());
            simulationRequest.setAnnualRate(credit.getAnnualRate());
            simulationRequest.setTermMonths(credit.getTermMonths());
            simulationRequest.setDisbursementDate(credit.getDisbursementDate());
            simulationRequest.setPaymentDay(credit.getPaymentDay());

            var simulation = simulationService.simulateInternal(simulationRequest);

            if (simulation.getSavedInstallments() >= 1) {

                addIfNotSeen(
                        alerts,
                        userId,
                        "OPPORTUNITY_PREPAY",
                        credit.getId(),
                        new AlertResponse(
                                "OPPORTUNITY_PREPAY",
                                "TIP",
                                30,
                                "Podrías ahorrar cuotas en el crédito #" + credit.getId() + " si haces un abono extra.",
                                Map.of(
                                        "creditId", credit.getId(),
                                        "savedInstallments", simulation.getSavedInstallments()
                                )
                        )
                );
            }
        }

        // Gastos
        YearMonth now = YearMonth.now();

        MonthComparisonResponse comparison =
                expenseService.compareMonth(userId, now.getYear(), now.getMonthValue());

        if (comparison.getPercentageChange() != null
                && comparison.getPercentageChange().compareTo(BigDecimal.valueOf(15)) > 0) {

            addIfNotSeen(
                    alerts,
                    userId,
                    "SPEND_SPIKE",
                    null,
                    new AlertResponse(
                            "SPEND_SPIKE",
                            "WARNING",
                            60,
                            "Tus gastos subieron más del 15% frente al mes anterior.",
                            Map.of("differencePercent", comparison.getPercentageChange())
                    )
            );
        }

        if (alerts.isEmpty()) {

            alerts.add(
                    new AlertResponse(
                            "ALL_GOOD",
                            "INFO",
                            10,
                            "Todo en orden por ahora. ¡Buen manejo de tus finanzas! 👏",
                            Map.of()
                    )
            );
        }

        alerts.sort(Comparator.comparingInt(AlertResponse::getScore).reversed());

        log.info("Se generaron {} alertas para el usuario {}.", alerts.size(), userId);

        return alerts;
    }

    private void addIfNotSeen(
            List<AlertResponse> alerts,
            Long userId,
            String alertCode,
            Long relatedId,
            AlertResponse alert
    ) {

        boolean seen = seenRepository.existsByUserIdAndAlertCodeAndRelatedId(
                userId,
                alertCode,
                relatedId
        );

        if (!seen) {
            alerts.add(alert);
        }
    }
}