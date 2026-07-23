package com.jr.finance.api.saving;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "saving_movements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Schema(
        name = "SavingMovement",
        description = "Representa un movimiento o aporte realizado a una meta de ahorro."
)
public class SavingMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(
            description = "Identificador único del movimiento.",
            example = "1",
            accessMode = Schema.AccessMode.READ_ONLY
    )
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "saving_goal_id", nullable = false)
    @Schema(
            description = "Meta de ahorro a la que pertenece el movimiento.",
            accessMode = Schema.AccessMode.READ_ONLY
    )
    private SavingGoal savingGoal;

    @Column(nullable = false)
    @Schema(
            description = "Valor del aporte realizado.",
            example = "250000.00"
    )
    private BigDecimal amount;

    @Column(name = "movement_date", nullable = false)
    @Schema(
            description = "Fecha en la que se realizó el aporte.",
            example = "2026-07-22"
    )
    private LocalDate movementDate;
}