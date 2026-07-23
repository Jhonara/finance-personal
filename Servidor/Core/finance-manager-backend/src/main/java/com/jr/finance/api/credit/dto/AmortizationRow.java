package com.jr.finance.api.credit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@AllArgsConstructor
@Schema(
        name = "AmortizationRow",
        description = "Representa una cuota dentro de la tabla de amortización de un crédito."
)
public class AmortizationRow {

    @Schema(
            description = "Número de la cuota.",
            example = "1"
    )
    private int installment;

    @Schema(
            description = "Fecha programada para el pago de la cuota.",
            example = "2026-08-15"
    )
    private LocalDate date;

    @Schema(
            description = "Saldo pendiente antes de aplicar el pago.",
            example = "20000000.00"
    )
    private BigDecimal openingBalance;

    @Schema(
            description = "Cantidad de días transcurridos desde el pago anterior.",
            example = "30"
    )
    private int days;

    @Schema(
            description = "Valor correspondiente a intereses de la cuota.",
            example = "285000.75"
    )
    private BigDecimal interest;

    @Schema(
            description = "Valor abonado al capital del crédito.",
            example = "715000.25"
    )
    private BigDecimal principalPayment;

    @Schema(
            description = "Saldo restante después de aplicar el pago.",
            example = "19285000.00"
    )
    private BigDecimal endingBalance;

    @Schema(
            description = "Abono extraordinario realizado al capital en esta cuota. Si no existe, el valor será 0.",
            example = "500000.00"
    )
    private BigDecimal extraPayment;
}