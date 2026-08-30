package com.jr.finance.api.dashboard.dto;

import com.jr.finance.api.alerts.dto.AlertResponse;
import com.jr.finance.api.common.dto.MonthlyBalanceResponse;
import com.jr.finance.api.expense.dto.MonthComparisonResponse;
import com.jr.finance.api.expense.dto.MonthlySummaryResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@AllArgsConstructor
@Schema(
        name = "DashboardMonthResponse",
        description = "Información consolidada del dashboard financiero mensual del usuario."
)
public class DashboardMonthResponse {

    @Schema(
            description = "Total de ingresos registrados durante el mes.",
            example = "5000000.00"
    )
    private BigDecimal totalIncome;

    @Schema(
            description = "Total de gastos registrados durante el mes.",
            example = "3200000.00"
    )
    private BigDecimal totalExpense;

    @Schema(
            description = "Balance del mes (ingresos menos gastos).",
            example = "1800000.00"
    )
    private BigDecimal balance;
    private BigDecimal netCashFlow;
    private java.util.Map<String, BigDecimal> netWorthByCurrency;
    private java.util.Map<String, BigDecimal> assetsByCurrency;
    private java.util.Map<String, BigDecimal> liabilitiesByCurrency;
    private List<DashboardAccountResponse> accounts;
    private DashboardBudgetSummary budgets;

    @Schema(
            description = "Resumen de gastos del período."
    )
    private MonthlySummaryResponse expenseSummary;

    @Schema(
            description = "Comparación de gastos frente al mes anterior."
    )
    private MonthComparisonResponse comparison;

    @Schema(
            description = "Progreso de las metas de ahorro del usuario."
    )
    private List<SavingProgressResponse> savings;

    @Schema(
            description = "Categorías con mayor gasto durante el mes."
    )
    private List<TopCategoryResponse> topCategories;

    @Schema(
            description = "Alertas financieras generadas para el usuario."
    )
    private List<AlertResponse> alerts;

    @Schema(
            description = "Resumen rápido del estado de los créditos registrados."
    )
    private List<DashboardCreditResponse> credits;
    private List<DashboardRecentTransactionResponse> recentTransactions;

    @Schema(
            description = "Resumen financiero generado por Inteligencia Artificial.",
            example = "Tus gastos disminuyeron un 8% respecto al mes anterior y mantienes un flujo de caja positivo."
    )
    private String aiSummary;
}
