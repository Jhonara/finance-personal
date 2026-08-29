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
import com.jr.finance.api.budget.BudgetService;
import com.jr.finance.api.budget.BudgetStatus;
import com.jr.finance.api.budget.BudgetRepository;
import com.jr.finance.api.budget.dto.BudgetResponse;
import com.jr.finance.api.user.User;
import com.jr.finance.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlertService {

    private static final String BUDGET_WARNING = "BUDGET_WARNING";
    private static final String BUDGET_EXCEEDED = "BUDGET_EXCEEDED";

    private final UserRepository userRepository;
    private final CreditRepository creditRepository;
    private final CreditPlanVsRealService planVsRealService;
    private final CreditSimulationService simulationService;
    private final ExpenseService expenseService;
    private final UserAlertSeenRepository seenRepository;
    private final BudgetService budgetService;
    private final BudgetRepository budgetRepository;

    public List<AlertResponse> buildAlerts(Long userId) {
        YearMonth now = YearMonth.now();
        return buildAlerts(userId, now.getYear(), now.getMonthValue(), true);
    }

    public List<AlertResponse> buildAlerts(Long userId, int year, int month, boolean includeCurrentState) {
        return buildAlerts(userId, year, month, includeCurrentState, null);
    }

    public List<AlertResponse> buildAlerts(Long userId, int year, int month, boolean includeCurrentState,
                                           List<BudgetResponse> dashboardBudgets) {

        log.info("Generando alertas para el usuario {}.", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.warn("Usuario {} no encontrado al generar alertas.", userId);
                    return new NotFoundException("El usuario no existe");
                });

        List<AlertResponse> alerts = new ArrayList<>();

        // Créditos
        List<Credit> credits = includeCurrentState ? creditRepository.findByUserId(userId) : List.of();

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
        MonthComparisonResponse comparison =
                expenseService.compareMonth(userId, year, month);

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

        List<BudgetResponse> budgets = dashboardBudgets == null
                ? budgetService.list(userId, year, month)
                : dashboardBudgets;
        for (var budget : budgets) {
            if (budget.getStatus() == BudgetStatus.WARNING) {
                addIfNotSeen(alerts, userId, BUDGET_WARNING, budget.getId(),
                        budgetAlert(BUDGET_WARNING, "WARNING", 80,
                                "Alcanzaste el límite de alerta del presupuesto " + budget.getCategoryName() + ".",
                                budget));
            } else if (budget.getStatus() == BudgetStatus.EXCEEDED) {
                addIfNotSeen(alerts, userId, BUDGET_EXCEEDED, budget.getId(),
                        budgetAlert(BUDGET_EXCEEDED, "WARNING", 95,
                                "Excediste el presupuesto " + budget.getCategoryName() + ".",
                                budget));
            }
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

    @Transactional
    public void markAsSeen(Long userId, String code, Long relatedId) {
        if ("ALL_GOOD".equals(code)) {
            throw new NotFoundException("La alerta no existe");
        }

        if (seenRepository.existsByUserIdAndAlertCodeAndRelatedId(userId, code, relatedId)) {
            return;
        }

        List<AlertResponse> activeAlerts;
        if (isBudgetAlert(code)) {
            if (relatedId == null) {
                throw new NotFoundException("La alerta no existe");
            }
            var budget = budgetRepository.findByIdAndUserId(relatedId, userId)
                    .orElseThrow(() -> new NotFoundException("La alerta no existe"));
            activeAlerts = buildAlerts(userId, budget.getYear(), budget.getMonth(), false);
        } else {
            activeAlerts = buildAlerts(userId);
        }

        boolean exists = activeAlerts.stream()
                .anyMatch(alert -> code.equals(alert.getCode())
                        && Objects.equals(relatedId, relatedIdOf(alert)));
        if (!exists) {
            throw new NotFoundException("La alerta no existe");
        }

        UserAlertSeen seen = new UserAlertSeen();
        seen.setUserId(userId);
        seen.setAlertCode(code);
        seen.setRelatedId(relatedId);
        seen.setSeenAt(java.time.LocalDateTime.now());
        seenRepository.save(seen);
    }

    private boolean isBudgetAlert(String code) {
        return BUDGET_WARNING.equals(code) || BUDGET_EXCEEDED.equals(code);
    }

    private Long relatedIdOf(AlertResponse alert) {
        Object relatedId = alert.getData().get("budgetId");
        if (relatedId == null) {
            relatedId = alert.getData().get("creditId");
        }
        return relatedId instanceof Number number ? number.longValue() : null;
    }

    private AlertResponse budgetAlert(String code, String severity, int score, String message,
                                      com.jr.finance.api.budget.dto.BudgetResponse budget) {
        return new AlertResponse(code, severity, score, message, Map.of(
                "budgetId", budget.getId(), "categoryId", budget.getCategoryId(),
                "categoryName", budget.getCategoryName(), "year", budget.getYear(), "month", budget.getMonth(),
                "limitAmount", budget.getLimitAmount(), "spentAmount", budget.getSpentAmount(),
                "remainingAmount", budget.getRemainingAmount(), "percentageUsed", budget.getPercentageUsed()));
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
