package com.jr.finance.api.saving.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class AddSavingMovementRequest {

    @NotNull(message = "El monto es obligatorio")
    @Positive(message = "El aporte al objetivo debe ser mayor que 0")
    private BigDecimal amount;

    @NotNull(message = "La fecha es obligatoria")
    private LocalDate movementDate;
}
