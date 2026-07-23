package com.jr.finance.api.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@Schema(
        name = "TopCategoryResponse",
        description = "Representa una de las categorías con mayor gasto del usuario durante el período consultado."
)
public class TopCategoryResponse {

    @Schema(
            description = "Nombre de la categoría.",
            example = "Alimentación"
    )
    private String category;

    @Schema(
            description = "Monto total gastado en la categoría.",
            example = "1250000.00"
    )
    private BigDecimal total;
}