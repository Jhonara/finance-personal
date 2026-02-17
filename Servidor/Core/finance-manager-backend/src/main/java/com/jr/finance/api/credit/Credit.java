package com.jr.finance.api.credit;

import com.jr.finance.api.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "credits")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class Credit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private String name;

    @Column(name = "amount", nullable = false)
    private BigDecimal principal;

    @Column(name = "interest_rate", nullable = false)
    private BigDecimal annualRate; // EA

    @Column(name = "installments", nullable = false)
    private Integer termMonths;

    @Column(name = "start_date", nullable = false)
    private LocalDate disbursementDate;

    @Column(name = "payment_day")
    private Integer paymentDay;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
