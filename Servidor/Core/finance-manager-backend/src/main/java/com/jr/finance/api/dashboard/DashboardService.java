package com.jr.finance.api.dashboard;

import com.jr.finance.api.common.BalanceService;
import com.jr.finance.api.dashboard.dto.DashboardMonthResponse;
import com.jr.finance.api.expense.ExpenseService;
import com.jr.finance.api.saving.SavingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ExpenseService expenseService;
    private final BalanceService balanceService;
    private final SavingService savingService;

    public DashboardMonthResponse getMonthDashboard(Long userId, int year, int month) {
        var summary = expenseService.monthlySummary(userId, year, month);
        var balance = balanceService.monthlyBalance(userId, year, month);
        var comparison = expenseService.compareMonth(userId, year, month);
        var savings = savingService.listGoals(userId);

        return new DashboardMonthResponse(summary, balance, comparison, savings);
    }
}
