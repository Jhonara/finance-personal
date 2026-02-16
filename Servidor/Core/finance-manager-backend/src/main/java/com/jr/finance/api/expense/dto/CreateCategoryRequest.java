package com.jr.finance.api.expense.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateCategoryRequest {

    @NotBlank(message = "El nombre de la categoría es obligatorio")
    private String name;
}
