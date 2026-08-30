package com.jr.finance.api.expense.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import com.jr.finance.api.expense.CategoryType;
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
    @Size(max = 100, message = "El nombre de la categoría no puede superar 100 caracteres")
    private String name;

    @NotNull(message = "El tipo de categoría es obligatorio")
    private CategoryType type;
}
