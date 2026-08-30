package com.jr.finance.api.account.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

@Schema(name = "CreateOpeningBalanceRequest", description = "Saldo inicial único de una cuenta. Puede ser positivo o negativo.")
public record CreateOpeningBalanceRequest(
        @NotNull(message = "El monto del saldo de apertura es obligatorio")
        @Schema(example = "1500000.00", requiredMode = Schema.RequiredMode.REQUIRED)
        BigDecimal amount,
        @NotNull(message = "La fecha efectiva es obligatoria")
        @Schema(example = "2026-08-30", requiredMode = Schema.RequiredMode.REQUIRED)
        LocalDate effectiveDate,
        @Size(max = 255, message = "La descripción no puede superar 255 caracteres")
        @Schema(example = "Saldo al iniciar el uso de la aplicación")
        String description
) {
}
