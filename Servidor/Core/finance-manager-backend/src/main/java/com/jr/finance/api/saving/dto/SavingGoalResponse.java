package com.jr.finance.api.saving.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Schema(
        name = "SavingGoalResponse",
        description = "Información de una meta de ahorro."
)
public class SavingGoalResponse {

    @Schema(
            description = "Identificador de la meta.",
            example = "1"
    )
    private Long id;

    @Schema(
            description = "Nombre de la meta de ahorro.",
            example = "Comprar moto"
    )
    private String name;

    @Schema(
            description = "Monto objetivo.",
            example = "15000000.00"
    )
    private BigDecimal targetAmount;

    @Schema(
            description = "Monto ahorrado hasta el momento.",
            example = "3200000.00"
    )
    private BigDecimal currentAmount;

    @Schema(
            description = "Indica si la meta ya fue cumplida.",
            example = "false"
    )
    private boolean completed;

    @Schema(
            description = "Porcentaje de progreso de la meta.",
            example = "21.33"
    )
    private BigDecimal progress;
}