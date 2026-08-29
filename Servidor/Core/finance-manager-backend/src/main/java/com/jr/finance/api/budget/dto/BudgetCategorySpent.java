package com.jr.finance.api.budget.dto;

import java.math.BigDecimal;

public interface BudgetCategorySpent {
    Long getCategoryId();
    BigDecimal getSpentAmount();
}
