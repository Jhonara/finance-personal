package com.jr.finance.api.expense.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import com.jr.finance.api.expense.CategoryType;

import java.time.LocalDateTime;

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

    private CategoryType type;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long version;
}
