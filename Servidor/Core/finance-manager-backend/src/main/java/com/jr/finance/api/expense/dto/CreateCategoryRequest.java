package com.jr.finance.api.expense.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
@Schema(
        name = "CreateCategoryRequest",
        description = "Información necesaria para crear una nueva categoría de gastos."
)
public class CreateCategoryRequest {

    @Schema(
            description = "Nombre de la categoría.",
            example = "Alimentación"
    )
    @NotBlank(message = "El nombre de la categoría es obligatorio")
    private String name;
}