package com.jr.finance.api.recurrence;

import com.jr.finance.api.account.Account;
import com.jr.finance.api.expense.Category;
import com.jr.finance.api.ledger.FinancialTransaction;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity @Getter @Setter @NoArgsConstructor
@Table(name = "recurring_occurrences", uniqueConstraints = @UniqueConstraint(
        name = "uk_recurring_due", columnNames = {"rule_id", "due_date"}))
public class RecurringOccurrence {
    public enum Status { PENDING, POSTED, SKIPPED }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "rule_id") private RecurringRule rule;
    @Column(nullable = false) private LocalDate dueDate;
    @Column(nullable = false, length = 100) private String name;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16) private RecurrenceKind kind;
    @Column(nullable = false, precision = 19, scale = 4) private BigDecimal amount;
    @Column(nullable = false, length = 3) private String currency;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "account_id") private Account account;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "category_id") private Category category;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16) private Status status = Status.PENDING;
    @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "transaction_id", unique = true) private FinancialTransaction transaction;
    @Column(length = 180) private String issue;
}
