package com.jr.finance.api.saving;

import com.jr.finance.api.user.User;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "saving_goals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Schema(
        name = "SavingGoal",
        description = "Representa una meta de ahorro creada por un usuario."
)
public class SavingGoal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(
            description = "Identificador único de la meta de ahorro.",
            example = "1",
            accessMode = Schema.AccessMode.READ_ONLY
    )
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @Schema(
            description = "Usuario propietario de la meta de ahorro.",
            accessMode = Schema.AccessMode.READ_ONLY
    )
    private User user;

    @Column(nullable = false)
    @Schema(
            description = "Nombre de la meta de ahorro.",
            example = "Comprar moto"
    )
    private String name;

    @Column(name = "target_amount", nullable = false)
    @Schema(
            description = "Monto objetivo que se desea alcanzar.",
            example = "15000000.00"
    )
    private BigDecimal targetAmount;

    @Column(name = "current_amount", nullable = false)
    @Schema(
            description = "Monto acumulado hasta el momento.",
            example = "3200000.00"
    )
    private BigDecimal currentAmount = BigDecimal.ZERO;

    @Column(nullable = false)
    @Schema(
            description = "Indica si la meta de ahorro ya fue alcanzada.",
            example = "false"
    )
    private boolean completed = false;
}