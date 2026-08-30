package com.jr.finance.api.expense.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Null;
import jakarta.validation.constraints.Size;
import lombok.Data;
import com.jr.finance.api.expense.CategoryType;

@Data
@Schema(name = "UpdateCategoryRequest", description = "Metadatos editables de una categoría. El tipo es inmutable.")
public class UpdateCategoryRequest {

    @Size(min = 1, max = 100, message = "El nombre de la categoría debe tener entre 1 y 100 caracteres")
    private String name;

    private Boolean active;

    @Null(message = "El tipo de categoría no se puede modificar")
    private CategoryType type;

    @NotNull(message = "La versión de la categoría es obligatoria")
    private Long version;
}
