package com.jr.finance.api.budget;

import com.jr.finance.api.expense.Category;
import com.jr.finance.api.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "budgets", uniqueConstraints = @UniqueConstraint(
        name = "uk_budgets_user_category_period",
        columnNames = {"user_id", "category_id", "period_year", "period_month"}))
@Getter
@Setter
@NoArgsConstructor
public class Budget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(name = "period_year", nullable = false)
    private int year;

    @Column(name = "period_month", nullable = false)
    private int month;

    @Column(name = "limit_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal limitAmount;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Version
    @Column(nullable = false)
    private Long version;
}
