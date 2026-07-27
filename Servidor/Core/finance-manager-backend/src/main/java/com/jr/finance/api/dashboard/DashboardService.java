package com.jr.finance.api.dashboard;

import com.jr.finance.api.alerts.AlertService;
import com.jr.finance.api.common.BalanceService;
import com.jr.finance.api.dashboard.dto.DashboardMonthResponse;
import com.jr.finance.api.dashboard.dto.SavingProgressResponse;
import com.jr.finance.api.dashboard.dto.TopCategoryResponse;
import com.jr.finance.api.expense.ExpenseService;
import com.jr.finance.api.saving.SavingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ExpenseService expenseService;
    private final BalanceService balanceService;
    private final SavingService savingService;
    private final AlertService alertService;

    public DashboardMonthResponse getMonthDashboard(Long userId, int year, int month) {

        log.info("Generando dashboard del usuario {} para {}/{}.",
                userId,
                month,
                year);

        var summary = expenseService.monthlySummary(userId, year, month);
        var balanceResponse = balanceService.monthlyBalance(userId, year, month);
        var comparison = expenseService.compareMonth(userId, year, month);

        // Totales rápidos
        BigDecimal totalExpense = summary.getTotal();
        BigDecimal totalIncome = balanceResponse.getTotalIncome();
        BigDecimal balance = balanceResponse.getBalance();

        // Top 3 categorías
        List<TopCategoryResponse> topCategories = summary.getTotalByCategory()
                .entrySet()
                .stream()
                .map(entry -> new TopCategoryResponse(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparing(TopCategoryResponse::getTotal).reversed())
                .limit(3)
                .collect(Collectors.toList());

        // Metas de ahorro
        List<SavingProgressResponse> savings = savingService.listGoals(userId)
                .stream()
                .map(goal -> new SavingProgressResponse(
                        goal.getId(),
                        goal.getName(),
                        goal.getTargetAmount(),
                        goal.getCurrentAmount(),
                        savingService.progressPercentage(goal),
                        goal.isCompleted()
                ))
                .toList();

        var alerts = alertService.buildAlerts(userId);

        log.info("Dashboard generado correctamente para el usuario {}.", userId);

        return new DashboardMonthResponse(
                totalIncome,
                totalExpense,
                balance,
                summary,
                comparison,
                savings,
                topCategories,
                alerts,
                List.of(),
                null
        );
    }
}