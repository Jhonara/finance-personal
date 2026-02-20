package com.jr.finance.api.alerts.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.Map;

@Data
@AllArgsConstructor
public class AlertResponse {
    private String code;        // CREDIT_BEHIND, HIGH_INTEREST, SPEND_SPIKE, OPPORTUNITY_PREPAY
    private String severity;    // INFO | WARNING | TIP
    private int score;          // 0 - 100
    private String message;     // IA lo podrá reescribir
    private Map<String, Object> data;
}
