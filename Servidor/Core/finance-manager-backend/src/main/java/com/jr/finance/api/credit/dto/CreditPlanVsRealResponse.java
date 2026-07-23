package com.jr.finance.api.credit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@Schema(
        name = "CreditPlanVsRealResponse",
        description = "Resultado de la comparación entre el plan de pagos teórico del crédito y los pagos realmente realizados."
)
public class CreditPlanVsRealResponse {

    @Schema(
            description = "Identificador del crédito.",
            example = "1"
    )
    private Long creditId;

    @Schema(
            description = "Valor total que debería haberse pagado hasta la fecha según el plan de amortización.",
            example = "5400000.00"
    )
    private BigDecimal plannedTotalToDate;

    @Schema(
            description = "Valor total que realmente ha pagado el usuario hasta la fecha.",
            example = "5200000.00"
    )
    private BigDecimal realTotalPaid;

    @Schema(
            description = "Capital que debería haberse amortizado hasta la fecha según el plan.",
            example = "3850000.00"
    )
    private BigDecimal plannedCapitalPaid;

    @Schema(
            description = "Capital que realmente ha sido amortizado por el usuario.",
            example = "3700000.00"
    )
    private BigDecimal realCapitalPaid;

    @Schema(
            description = "Intereses que deberían haberse pagado hasta la fecha según el plan.",
            example = "1550000.00"
    )
    private BigDecimal plannedInterestPaid;

    @Schema(
            description = "Intereses que realmente ha pagado el usuario.",
            example = "1500000.00"
    )
    private BigDecimal realInterestPaid;

    @Schema(
            description = "Saldo actual del crédito calculado con base en los pagos realmente realizados.",
            example = "16300000.00"
    )
    private BigDecimal realCurrentBalance;

    @Schema(
            description = "Número de cuotas que deberían haberse pagado hasta la fecha.",
            example = "8"
    )
    private int plannedInstallments;

    @Schema(
            description = "Número de cuotas que realmente ha pagado el usuario.",
            example = "7"
    )
    private int realInstallments;

    @Schema(
            description = "Estado del crédito respecto al plan de pagos.",
            example = "ATRASADO",
            allowableValues = {
                    "ADELANTADO",
                    "AL_DIA",
                    "ATRASADO"
            }
    )
    private String status;
}