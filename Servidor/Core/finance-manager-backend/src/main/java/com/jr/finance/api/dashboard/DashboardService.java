package com.jr.finance.api.dashboard;

import com.jr.finance.api.common.BalanceService;
import com.jr.finance.api.dashboard.dto.*;
import com.jr.finance.api.expense.ExpenseService;
import com.jr.finance.api.saving.SavingService;
import com.jr.finance.api.alerts.AlertService;
import com.jr.finance.api.credit.CreditPlanVsRealService;
import com.jr.finance.api.credit.CreditRepository;
import com.jr.finance.api.dashboard.dto.CreditQuickStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ExpenseService expenseService;
    private final BalanceService balanceService;
    private final SavingService savingService;
    private final AlertService alertService;

    public DashboardMonthResponse getMonthDashboard(Long userId, int year, int month) {
        var summary = expenseService.monthlySummary(userId, year, month);
        var balanceRes = balanceService.monthlyBalance(userId, year, month);
        var comparison = expenseService.compareMonth(userId, year, month);

        // Totales rápidos
        BigDecimal totalExpense = summary.getTotal();
        BigDecimal totalIncome = balanceRes.getTotalIncome();
        BigDecimal balance = balanceRes.getBalance();

        // Top 3 categorías
        List<TopCategoryResponse> topCategories = summary.getTotalByCategory().entrySet().stream()
                .map(e -> new TopCategoryResponse(e.getKey(), e.getValue()))
                .sorted(Comparator.comparing(TopCategoryResponse::getTotal).reversed())
                .limit(3)
                .collect(Collectors.toList());

        // Ahorros con progreso
        var savings = savingService.listGoals(userId).stream()
                .map(g -> new SavingProgressResponse(
                        g.getId(),
                        g.getName(),
                        g.getTargetAmount(),
                        g.getCurrentAmount(),
                        savingService.progressPercentage(g),
                        g.isCompleted()
                ))
                .toList();

        var alerts = alertService.buildAlerts(userId);

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
