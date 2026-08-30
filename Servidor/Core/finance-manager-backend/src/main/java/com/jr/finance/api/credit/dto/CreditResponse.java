package com.jr.finance.api.credit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import com.jr.finance.api.credit.CreditStatus;

@Data
@Schema(
        name = "CreditResponse",
        description = "Información de un crédito registrado."
)
public class CreditResponse {

    @Schema(description = "Identificador del crédito.", example = "1")
    private Long id;

    @Schema(description = "Nombre del crédito.", example = "Moto Dominar 400")
    private String name;

    @Schema(description = "Valor desembolsado.", example = "18000000.00")
    private BigDecimal principal;

    @Schema(description = "Tasa efectiva anual.", example = "24.50")
    private BigDecimal annualRate;

    @Schema(description = "Número de cuotas.", example = "60")
    private Integer termMonths;

    @Schema(description = "Fecha de desembolso.", example = "2026-07-22")
    private LocalDate disbursementDate;

    @Schema(description = "Día de pago.", example = "15")
    private Integer paymentDay;

    @Schema(description = "Fecha de creación.", example = "2026-07-22T08:30:00")
    private LocalDateTime createdAt;

    private String currency;
    private Long version;
    private BigDecimal remainingBalance;
    private CreditStatus status;
    private LocalDate nextPaymentDate;
    private BigDecimal expectedPaymentAmount;
    private BigDecimal paidPrincipal;
    private BigDecimal paidInterest;
    private boolean disbursementLinked;
    private Long disbursementTransactionId;
}
