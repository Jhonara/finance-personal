package com.jr.finance.api.inbox;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.*;

@Entity @Getter @Setter
@Table(name = "purchase_drafts", uniqueConstraints = @UniqueConstraint(name = "uk_purchase_draft_request", columnNames = {"user_id", "request_key"}))
public class PurchaseDraft {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long userId;
    @Column(nullable = false, length = 80) private String requestKey;
    @Column(nullable = false, length = 64) private String initialFingerprint;
    @Version @Column(nullable = false) private long version;
    @Column(nullable = false, length = 16) private String kind;
    @Column(nullable = false, length = 16) private String source = "PASTED_TEXT";
    @Column(nullable = false, length = 16) private String status = "PENDING";
    @Column(nullable = false, length = 120) private String description;
    @Column(precision = 19, scale = 4) private BigDecimal amount;
    @Column(length = 3) private String currency;
    private LocalDate effectiveDate;
    private Long accountId;
    private Long categoryId;
    private Long transactionId;
    @Column(length = 64) private String nativeFingerprint;
    @Column(length = 80) private String cardReference;
    @Column(length = 16) private String cardKind;
    private OffsetDateTime occurredAt;
    @Column(nullable = false) private Instant createdAt;
}
