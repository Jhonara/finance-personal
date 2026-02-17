package com.jr.finance.api.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class TopCategoryResponse {
    private String category;
    private BigDecimal total;
}
