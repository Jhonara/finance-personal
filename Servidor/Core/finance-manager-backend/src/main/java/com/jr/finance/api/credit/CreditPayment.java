package com.jr.finance.api.credit;

import com.jr.finance.api.account.Account;
import com.jr.finance.api.ledger.FinancialTransaction;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "credit_payments")
@Data
@Schema(
        name = "CreditPayment",
        description = "Entidad que representa un pago realizado sobre un crédito."
)
public class CreditPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(
            description = "Identificador único del pago.",
            example = "1"
    )
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "credit_id", nullable = false)
    @Schema(
            description = "Crédito al que pertenece el pago."
    )
    private Credit credit;

    @Column(name = "total_amount", nullable = false, precision = 19, scale = 4)
    @Schema(
            description = "Valor del pago realizado.",
            example = "850000.00"
    )
    private BigDecimal totalAmount;

    // Retained only because V1/V2 require it; canonical consumers use totalAmount.
    @Column(name = "amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal legacyAmount;

    @Column(name = "principal_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal principalAmount;

    @Column(name = "interest_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal interestAmount;

    @Column(nullable = false)
    @Schema(
            description = "Fecha en la que se realizó el pago.",
            example = "2026-08-15"
    )
    private LocalDate paymentDate;

    @Column(name = "extra_principal_amount", nullable = false, precision = 19, scale = 4)
    @Schema(
            description = "Abono extraordinario aplicado al capital del crédito. Si no existe, el valor será nulo.",
            example = "500000.00",
            nullable = true
    )
    private BigDecimal extraPrincipalAmount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id")
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "financial_transaction_id")
    private FinancialTransaction financialTransaction;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CreditPaymentStatus status = CreditPaymentStatus.POSTED;

    @Column(name = "created_at", updatable = false, insertable = false)
    @Schema(
            description = "Fecha y hora en la que el pago fue registrado en el sistema.",
            example = "2026-08-15T14:30:10"
    )
    private LocalDateTime createdAt;
}
