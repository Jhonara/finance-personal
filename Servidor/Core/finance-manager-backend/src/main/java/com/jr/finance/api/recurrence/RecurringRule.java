package com.jr.finance.api.recurrence;

import com.jr.finance.api.account.Account;
import com.jr.finance.api.expense.Category;
import com.jr.finance.api.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity @Getter @Setter @NoArgsConstructor
@Table(name = "recurring_rules", uniqueConstraints = @UniqueConstraint(
        name = "uk_recurring_request", columnNames = {"user_id", "request_key"}))
public class RecurringRule {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id") private User user;
    @Column(nullable = false, length = 36) private String requestKey;
    @Column(nullable = false, length = 100) private String name;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16) private RecurrenceKind kind;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16) private RecurrenceFrequency frequency;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16) private RecurrenceMode mode;
    @Column(nullable = false, precision = 19, scale = 4) private BigDecimal amount;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "account_id") private Account account;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "category_id") private Category category;
    @Column(nullable = false, length = 3) private String currency;
    @Column(nullable = false, length = 64) private String timeZone;
    @Column(nullable = false) private LocalDate startDate;
    private LocalDate endDate;
    @Column(nullable = false) private int firstDay;
    private Integer secondDay;
    @Column(nullable = false) private LocalDate nextDate;
    @Column(nullable = false) private boolean active = true;
    @Version @Column(nullable = false) private Long version;
}
