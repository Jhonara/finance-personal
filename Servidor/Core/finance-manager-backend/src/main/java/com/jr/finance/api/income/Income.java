package com.jr.finance.api.income;

import com.jr.finance.api.user.User;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "incomes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Schema(
        name = "Income",
        description = "Representa un ingreso registrado por un usuario."
)
public class Income {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(
            description = "Identificador único del ingreso.",
            example = "1",
            accessMode = Schema.AccessMode.READ_ONLY
    )
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @Schema(
            description = "Usuario propietario del ingreso.",
            accessMode = Schema.AccessMode.READ_ONLY
    )
    private User user;

    @Column(nullable = false)
    @Schema(
            description = "Valor del ingreso.",
            example = "3500000.00"
    )
    private BigDecimal amount;

    @Schema(
            description = "Descripción opcional del ingreso.",
            example = "Salario correspondiente al mes de julio."
    )
    private String description;

    @Column(name = "income_type")
    @Schema(
            description = "Tipo de ingreso.",
            example = "SALARY",
            allowableValues = {
                    "SALARY",
                    "EXTRA"
            }
    )
    private String incomeType;

    @Column(name = "income_date", nullable = false)
    @Schema(
            description = "Fecha en la que se recibió el ingreso.",
            example = "2026-07-22"
    )
    private LocalDate incomeDate;
}