package com.jr.finance.api.alerts.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.Map;

@Data
@AllArgsConstructor
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
}