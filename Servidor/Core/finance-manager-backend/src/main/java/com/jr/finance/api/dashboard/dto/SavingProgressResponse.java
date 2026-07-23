package com.jr.finance.api.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@Schema(
        name = "SavingProgressResponse",
        description = "Información del progreso de una meta de ahorro."
)
public class SavingProgressResponse {

    @Schema(
            description = "Identificador único de la meta de ahorro.",
            example = "1"
    )
    private Long id;

    @Schema(
            description = "Nombre de la meta de ahorro.",
            example = "Viaje a Japón"
    )
    private String name;

    @Schema(
            description = "Monto objetivo de la meta.",
            example = "15000000.00"
    )
    private BigDecimal target;

    @Schema(
            description = "Monto acumulado hasta la fecha.",
            example = "6250000.00"
    )
    private BigDecimal current;

    @Schema(
            description = "Porcentaje de avance de la meta.",
            example = "41.67"
    )
    private BigDecimal progressPercent;

    @Schema(
            description = "Indica si la meta ya fue completada.",
            example = "false"
    )
    private boolean completed;
}