package com.jr.finance.api.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@Schema(
        name = "CreditQuickStatus",
        description = "Resumen del estado actual de un crédito mostrado en el dashboard."
)
public class CreditQuickStatus {

    @Schema(
            description = "Identificador único del crédito.",
            example = "1"
    )
    private Long creditId;

    @Schema(
            description = "Saldo pendiente del crédito.",
            example = "18500000.00"
    )
    private BigDecimal currentBalance;

    @Schema(
            description = "Estado actual del crédito respecto al plan de pagos.",
            example = "AL_DIA",
            allowableValues = {
                    "AL_DIA",
                    "ATRASADO",
                    "ADELANTADO"
            }
    )
    private String status;
}