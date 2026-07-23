package com.jr.finance.api.expense.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
@Schema(
        name = "CategoryResponse",
        description = "Información de una categoría de gastos."
)
public class CategoryResponse {

    @Schema(
            description = "Identificador de la categoría.",
            example = "1"
    )
    private Long id;

    @Schema(
            description = "Nombre de la categoría.",
            example = "Alimentación"
    )
    private String name;
}