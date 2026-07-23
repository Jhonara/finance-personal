package com.jr.finance.api.credit;

import com.jr.finance.api.user.User;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "credits")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Schema(
        name = "Credit",
        description = "Entidad que representa un crédito registrado por un usuario."
)
public class Credit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(
            description = "Identificador único del crédito.",
            example = "1"
    )
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @Schema(
            description = "Usuario propietario del crédito."
    )
    private User user;

    @Column(nullable = false)
    @Schema(
            description = "Nombre o descripción del crédito.",
            example = "Crédito de vehículo"
    )
    private String name;

    @Column(name = "amount", nullable = false)
    @Schema(
            description = "Monto desembolsado del crédito.",
            example = "30000000.00"
    )
    private BigDecimal principal;

    @Column(name = "interest_rate", nullable = false)
    @Schema(
            description = "Tasa de interés efectiva anual (EA) del crédito, expresada en porcentaje.",
            example = "18.50"
    )
    private BigDecimal annualRate;

    @Column(name = "installments", nullable = false)
    @Schema(
            description = "Cantidad total de cuotas del crédito.",
            example = "60"
    )
    private Integer termMonths;

    @Column(name = "start_date", nullable = false)
    @Schema(
            description = "Fecha de desembolso del crédito.",
            example = "2026-08-15"
    )
    private LocalDate disbursementDate;

    @Column(name = "payment_day")
    @Schema(
            description = "Día del mes en el que se realiza el pago de la cuota.",
            example = "15"
    )
    private Integer paymentDay;

    @Column(name = "created_at")
    @Schema(
            description = "Fecha y hora en la que el crédito fue registrado en el sistema.",
            example = "2026-08-15T10:30:45"
    )
    private LocalDateTime createdAt;
}