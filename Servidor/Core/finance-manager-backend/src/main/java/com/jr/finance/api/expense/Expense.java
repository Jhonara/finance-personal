package com.jr.finance.api.expense;

import com.jr.finance.api.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "expenses")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(nullable = false)
    private BigDecimal amount;

    private String description;

    @Column(name = "payment_type")
    private String paymentType; // CASH, CARD, CREDIT

    @Column(name = "expense_type")
    private String expenseType; // FIXED, VARIABLE

    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate;
}
