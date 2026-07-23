package com.jr.finance.api.credit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Schema(
        name = "CreateCreditRequest",
        description = "Información necesaria para registrar un nuevo crédito."
)
public class CreateCreditRequest {

    @Schema(
            description = "Nombre o descripción del crédito.",
            example = "Crédito de vehículo"
    )
    @NotBlank(message = "El nombre del crédito es obligatorio")
    private String name;

    @Schema(
            description = "Monto desembolsado del crédito.",
            example = "35000000.00"
    )
    @NotNull(message = "El monto del crédito es obligatorio")
    @Positive(message = "El monto del crédito debe ser mayor que 0")
    private BigDecimal principal;

    @Schema(
            description = "Tasa de interés efectiva anual (EA) del crédito, expresada en porcentaje.",
            example = "18.50"
    )
    @NotNull(message = "La tasa EA es obligatoria")
    @Positive(message = "La tasa EA debe ser mayor que 0")
    private BigDecimal annualRate;

    @Schema(
            description = "Cantidad de cuotas pactadas para el crédito.",
            example = "60"
    )
    @NotNull(message = "El plazo en meses es obligatorio")
    @Min(value = 1, message = "El plazo mínimo es 1 mes")
    private Integer termMonths;

    @Schema(
            description = "Fecha en la que se desembolsó el crédito.",
            example = "2026-08-15"
    )
    @NotNull(message = "La fecha de desembolso es obligatoria")
    private LocalDate disbursementDate;

    @Schema(
            description = "Día del mes en el que se debe realizar el pago de la cuota.",
            example = "15",
            minimum = "1",
            maximum = "31"
    )
    @NotNull(message = "El día de pago es obligatorio")
    @Min(value = 1, message = "El día de pago debe estar entre 1 y 31")
    @Max(value = 31, message = "El día de pago debe estar entre 1 y 31")
    private Integer paymentDay;
}