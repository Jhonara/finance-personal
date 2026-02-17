package com.jr.finance.api.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class SavingProgressResponse {
    private Long id;
    private String name;
    private BigDecimal target;
    private BigDecimal current;
    private BigDecimal progressPercent;
    private boolean completed;
}
