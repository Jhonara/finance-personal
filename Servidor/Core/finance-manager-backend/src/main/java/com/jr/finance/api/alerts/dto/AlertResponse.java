package com.jr.finance.api.alerts.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.NoArgsConstructor;
import lombok.Data;

import java.util.Map;

@Data
@NoArgsConstructor
@Schema(
        name = "AlertResponse",
        description = "Representa una alerta financiera generada por el sistema."
)
public class AlertResponse {

    @Schema(
            description = "Código único de la alerta.",
            example = "CREDIT_BEHIND"
    )
    private String code;

    @Schema(
            description = "Nivel de severidad de la alerta.",
            example = "WARNING"
    )
    private String severity;

    @Schema(
            description = "Prioridad de la alerta entre 0 y 100. Un valor mayor indica mayor importancia.",
            example = "90"
    )
    private int score;

    @Schema(
            description = "Mensaje mostrado al usuario.",
            example = "Vas atrasado en el crédito #12. Revisa tus pagos."
    )
    private String message;

    @Schema(
            description = "Información adicional relacionada con la alerta."
    )
    private Map<String, Object> data;

    private Long id;
    private Long revision;
    @Schema(allowableValues = {"ACTIVE", "SNOOZED", "RESOLVED", "ARCHIVED"})
    private String state;
    private boolean read;
    private java.time.Instant detectedAt;
    private java.time.Instant checkedAt;
    private java.time.Instant snoozedUntil;
    private java.time.Instant closedAt;

    public AlertResponse(String code, String severity, int score, String message, Map<String, Object> data) {
        this.code = code;
        this.severity = severity;
        this.score = score;
        this.message = message;
        this.data = data;
    }
}
