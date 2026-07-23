package com.jr.finance.api.credit;

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
    @JoinColumn(name = "credit_id")
    @Schema(
            description = "Crédito al que pertenece el pago."
    )
    private Credit credit;

    @Column(nullable = false, precision = 12, scale = 2)
    @Schema(
            description = "Valor del pago realizado.",
            example = "850000.00"
    )
    private BigDecimal amount;

    @Column(nullable = false)
    @Schema(
            description = "Fecha en la que se realizó el pago.",
            example = "2026-08-15"
    )
    private LocalDate paymentDate;

    @Column(precision = 12, scale = 2)
    @Schema(
            description = "Abono extraordinario aplicado al capital del crédito. Si no existe, el valor será nulo.",
            example = "500000.00",
            nullable = true
    )
    private BigDecimal extraPayment;

    @Column(name = "created_at", updatable = false, insertable = false)
    @Schema(
            description = "Fecha y hora en la que el pago fue registrado en el sistema.",
            example = "2026-08-15T14:30:10"
    )
    private LocalDateTime createdAt;
}