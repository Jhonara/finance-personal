package com.jr.finance.api.dashboard.dto;
import com.jr.finance.api.budget.dto.BudgetResponse;
import lombok.AllArgsConstructor; import lombok.Data;
import java.math.BigDecimal; import java.util.List;
@Data @AllArgsConstructor
public class DashboardBudgetSummary { private List<BudgetResponse> items; private BigDecimal totalBudgeted; private BigDecimal totalSpentOnBudgetedCategories; private BigDecimal totalRemaining; private BigDecimal overallPercentage; private long warningCount; private long exceededCount; }
