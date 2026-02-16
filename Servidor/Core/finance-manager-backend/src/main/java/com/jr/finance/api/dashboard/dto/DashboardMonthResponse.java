package com.jr.finance.api.dashboard.dto;

import com.jr.finance.api.common.dto.MonthlyBalanceResponse;
import com.jr.finance.api.expense.dto.MonthComparisonResponse;
import com.jr.finance.api.expense.dto.MonthlySummaryResponse;
import com.jr.finance.api.saving.SavingGoal;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class DashboardMonthResponse {
    private MonthlySummaryResponse expenseSummary;
    private MonthlyBalanceResponse balance;
    private MonthComparisonResponse comparison;
    private List<SavingGoal> savingGoals;
}
