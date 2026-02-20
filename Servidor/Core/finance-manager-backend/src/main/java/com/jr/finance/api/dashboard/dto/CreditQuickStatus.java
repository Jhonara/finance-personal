package com.jr.finance.api.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class CreditQuickStatus {
    private Long creditId;
    private BigDecimal currentBalance;
    private String status; // AL_DIA | ATRASADO | ADELANTADO
}
