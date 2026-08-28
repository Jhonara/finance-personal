package com.jr.finance.api.expense;

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
@Table(name = "expenses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Schema(
        name = "Expense",
        description = "Representa un gasto registrado por un usuario."
)
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(
            description = "Identificador único del gasto.",
            example = "1",
            accessMode = Schema.AccessMode.READ_ONLY
    )
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @Schema(
            description = "Usuario propietario del gasto.",
            accessMode = Schema.AccessMode.READ_ONLY
    )
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    @Schema(
            description = "Categoría asociada al gasto."
    )
    private Category category;

    @Column(nullable = false, precision = 19, scale = 4)
    @Schema(
            description = "Valor del gasto.",
            example = "85000.00"
    )
    private BigDecimal amount;

    @Column(length = 255)
    @Schema(
            description = "Descripción opcional del gasto.",
            example = "Compra de mercado semanal"
    )
    private String description;

    @Column(name = "payment_type", length = 50)
    @Schema(
            description = "Método de pago utilizado.",
            example = "CARD",
            allowableValues = {
                    "CASH",
                    "CARD",
                    "CREDIT"
            }
    )
    private String paymentType;

    @Column(name = "expense_type", length = 20)
    @Schema(
            description = "Clasificación del gasto.",
            example = "VARIABLE",
            allowableValues = {
                    "FIXED",
                    "VARIABLE"
            }
    )
    private String expenseType;

    @Column(name = "expense_date", nullable = false)
    @Schema(
            description = "Fecha en la que se realizó el gasto.",
            example = "2026-07-22"
    )
    private LocalDate expenseDate;
}
