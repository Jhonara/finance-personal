package com.jr.finance.api.budget.dto;

import com.jr.finance.api.budget.BudgetStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class BudgetResponse {
    private Long id;
    private Long categoryId;
    private String categoryName;
    private int year;
    private int month;
    private String period;
    private BigDecimal limitAmount;
    private BigDecimal spentAmount;
    private BigDecimal remainingAmount;
    private BigDecimal percentageUsed;
    private BudgetStatus status;
    private Long version;
}
