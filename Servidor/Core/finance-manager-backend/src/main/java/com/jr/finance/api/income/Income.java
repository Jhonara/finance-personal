package com.jr.finance.api.income;

import com.jr.finance.api.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "incomes")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class Income {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private BigDecimal amount;

    private String description;

    @Column(name = "income_type")
    private String incomeType; // SALARY, EXTRA

    @Column(name = "income_date", nullable = false)
    private LocalDate incomeDate;
}
