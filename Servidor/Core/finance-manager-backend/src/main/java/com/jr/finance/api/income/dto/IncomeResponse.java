package com.jr.finance.api.income.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Schema(
        name = "IncomeResponse",
        description = "Información de un ingreso registrado."
)
public class IncomeResponse {

    @Schema(description = "Identificador del ingreso.", example = "1")
    private Long id;

    @Schema(description = "Valor del ingreso.", example = "3500000.00")
    private BigDecimal amount;

    @Schema(description = "Descripción del ingreso.", example = "Salario julio")
    private String description;

    @Schema(description = "Tipo de ingreso.", example = "SALARY")
    private String incomeType;

    @Schema(description = "Fecha del ingreso.", example = "2026-07-22")
    private LocalDate incomeDate;
}