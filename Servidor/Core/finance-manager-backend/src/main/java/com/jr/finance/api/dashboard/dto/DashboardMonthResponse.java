package com.jr.finance.api.dashboard.dto;

import com.jr.finance.api.common.dto.MonthlyBalanceResponse;
import com.jr.finance.api.expense.dto.MonthComparisonResponse;
import com.jr.finance.api.expense.dto.MonthlySummaryResponse;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@AllArgsConstructor
public class DashboardMonthResponse {

    // Cards rápidas
    private BigDecimal totalIncome;
    private BigDecimal totalExpense;
    private BigDecimal balance;

    // Detalle
    private MonthlySummaryResponse expenseSummary;
    private MonthComparisonResponse comparison;

    // Ahorros
    private List<SavingProgressResponse> savings;

    // Top categorías
    private List<TopCategoryResponse> topCategories;

    // Alertas / insights
    private List<String> alerts;
}
