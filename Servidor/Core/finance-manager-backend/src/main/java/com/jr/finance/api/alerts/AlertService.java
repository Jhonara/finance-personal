package com.jr.finance.api.alerts;

import com.jr.finance.api.alerts.dto.AlertResponse;
import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.credit.*;
import com.jr.finance.api.budget.*;
import com.jr.finance.api.budget.dto.BudgetResponse;
import com.jr.finance.api.reports.ReportService;
import com.jr.finance.api.user.UserRepository;
import com.jr.finance.api.recurrence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.*;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class AlertService {
    private final UserRepository userRepository;
    private final CreditRepository creditRepository;
    private final CreditPlanVsRealService planVsRealService;
    private final UserAlertSeenRepository seenRepository;
    private final BudgetService budgetService;
    private final BudgetRepository budgetRepository;
    private final RecurringOccurrenceRepository recurringOccurrences;
    private final ReportService reports;
    private final Clock recurrenceClock;

    public List<AlertResponse> buildAlerts(Long userId) {
        var now = YearMonth.now(recurrenceClock.withZone(AlertLifecycleService.ZONE));
        return buildAlerts(userId, now.getYear(), now.getMonthValue(), true);
    }
    public List<AlertResponse> buildAlerts(Long userId, int year, int month, boolean current) {
        return buildAlerts(userId, year, month, current, null);
    }
    // Generate facts independently of read/snooze preferences. Historical dashboards stay read-only.
    public List<AlertResponse> buildAlerts(Long userId, int year, int month, boolean current,
                                         List<BudgetResponse> dashboardBudgets) {
        if (!userRepository.existsById(userId)) throw new NotFoundException("El usuario no existe");
        var alerts = new ArrayList<AlertResponse>();
        if (current) {
            var pending = recurringOccurrences.findByRuleUserIdAndStatus(userId, RecurringOccurrence.Status.PENDING);
            if (!pending.isEmpty()) {
                var first = pending.stream().min(Comparator.comparing(RecurringOccurrence::getDueDate)).orElseThrow();
                alerts.add(new AlertResponse("RECURRING_PENDING", "WARNING", 75,
                        "Hay pagos programados cuya fecha llegó y aún necesitan confirmación.",
                        Map.of("count", (long) pending.size(), "firstDueDate", first.getDueDate().toString(),
                                "latestPendingId", pending.stream().mapToLong(RecurringOccurrence::getId).max().orElseThrow())));
            }
            for (var credit : creditRepository.findByUserId(userId)) {
                var plan = planVsRealService.calculate(userId, credit.getId());
                var context = new LinkedHashMap<String, Object>();
                context.put("creditId", credit.getId());
                context.put("creditName", Objects.toString(credit.getName(), "Crédito"));
                if (credit.getCurrency() != null) context.put("currency", credit.getCurrency());
                context.put("plannedInstallments", plan.getPlannedInstallments());
                if ("ATRASADO".equals(plan.getStatus())) {
                    var data = new LinkedHashMap<>(context);
                    data.put("status", plan.getStatus());
                    data.put("pendingAmount", plan.getPlannedTotalToDate().subtract(plan.getRealTotalPaid()).max(BigDecimal.ZERO));
                    alerts.add(new AlertResponse("CREDIT_BEHIND", "WARNING", 90,
                            "Según el calendario y los pagos registrados, quedan cuotas por cubrir.", data));
                }
                if (plan.getPlannedInterestPaid().signum() > 0 && plan.getRealInterestPaid().compareTo(
                        plan.getPlannedInterestPaid().multiply(new BigDecimal("1.10"))) > 0) {
                    var data = new LinkedHashMap<>(context);
                    data.put("realInterest", plan.getRealInterestPaid());
                    data.put("plannedInterest", plan.getPlannedInterestPaid());
                    data.put("annualEffectiveRatePercent", credit.getAnnualRate());
                    alerts.add(new AlertResponse("HIGH_INTEREST", "WARNING", 70,
                            "Los intereses registrados superan en más del 10% la estimación del plan.", data));
                }
            }
        }
        var previous = YearMonth.of(year, month).minusMonths(1);
        var currentTotals = reports.month(userId, year, month);
        var previousTotals = reports.month(userId, previous.getYear(), previous.getMonthValue());
        for (var entry : currentTotals.entrySet()) {
            var before = previousTotals.get(entry.getKey());
            if (before == null || before.expense().signum() <= 0) continue;
            var difference = entry.getValue().expense().subtract(before.expense());
            var percent = difference.divide(before.expense(), 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));
            if (percent.compareTo(BigDecimal.valueOf(15)) > 0) alerts.add(new AlertResponse("SPEND_SPIKE", "WARNING", 60,
                    "Los gastos registrados de este mes superan en más del 15% los del mes anterior.",
                    Map.of("currency", entry.getKey(), "year", year, "month", month,
                            "differencePercent", percent, "currentExpense", entry.getValue().expense(),
                            "previousExpense", before.expense(), "comparison", "PREVIOUS_FULL_MONTH")));
        }
        var budgets = dashboardBudgets == null ? budgetService.list(userId, year, month) : dashboardBudgets;
        for (var budget : budgets) {
            if (budget.getStatus() != BudgetStatus.WARNING && budget.getStatus() != BudgetStatus.EXCEEDED) continue;
            boolean exceeded = budget.getStatus() == BudgetStatus.EXCEEDED;
            var data = new LinkedHashMap<String, Object>();
            data.put("budgetId", budget.getId()); data.put("categoryId", budget.getCategoryId());
            data.put("categoryName", budget.getCategoryName()); data.put("year", budget.getYear());
            data.put("month", budget.getMonth()); data.put("currency", "COP");
            data.put("limitAmount", budget.getLimitAmount()); data.put("spentAmount", budget.getSpentAmount());
            data.put("remainingAmount", budget.getRemainingAmount()); data.put("percentageUsed", budget.getPercentageUsed());
            alerts.add(new AlertResponse(exceeded ? "BUDGET_EXCEEDED" : "BUDGET_WARNING", "WARNING", exceeded ? 95 : 80,
                    exceeded ? "Los gastos de la categoría superan el presupuesto." : "Los gastos alcanzaron el umbral de aviso del presupuesto.", data));
        }
        if (alerts.isEmpty()) alerts.add(new AlertResponse("ALL_GOOD", "INFO", 0,
                "No encontramos avisos pendientes con los datos registrados.", Map.of()));
        alerts.sort(Comparator.comparingInt(AlertResponse::getScore).reversed());
        return alerts;
    }

    @Transactional
    public void markAsSeen(Long userId, String code, Long relatedId) {
        userRepository.lockForAlertUpdate(userId).orElseThrow(() -> new NotFoundException("El usuario no existe"));
        List<AlertResponse> active;
        if (code.startsWith("BUDGET_")) {
            if (relatedId == null) throw new NotFoundException("La alerta no existe");
            var budget = budgetRepository.findByIdAndUserId(relatedId, userId)
                    .orElseThrow(() -> new NotFoundException("La alerta no existe"));
            active = buildAlerts(userId, budget.getYear(), budget.getMonth(), false);
        } else active = buildAlerts(userId);
        if ("ALL_GOOD".equals(code) || active.stream().noneMatch(alert -> code.equals(alert.getCode())
                && Objects.equals(relatedId, relatedIdOf(alert)))) throw new NotFoundException("La alerta no existe");
        if (seenRepository.existsByUserIdAndAlertCodeAndRelatedId(userId, code, relatedId)) return;
        var seen = new UserAlertSeen(); seen.setUserId(userId); seen.setAlertCode(code);
        seen.setRelatedId(relatedId); seen.setSeenAt(LocalDateTime.now(recurrenceClock)); seenRepository.save(seen);
    }
    private Long relatedIdOf(AlertResponse alert) {
        var id = alert.getData().getOrDefault("budgetId", alert.getData().get("creditId"));
        return id instanceof Number value ? value.longValue() : null;
    }
}
