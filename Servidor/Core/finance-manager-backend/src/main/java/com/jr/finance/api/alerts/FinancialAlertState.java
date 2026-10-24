package com.jr.finance.api.alerts;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity @Getter @Setter
@Table(name = "financial_alert_states", uniqueConstraints = @UniqueConstraint(
        name = "uk_financial_alert_event", columnNames = {"user_id", "event_key"}))
public class FinancialAlertState {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long userId;
    @Column(nullable = false, length = 180) private String eventKey;
    @Column(nullable = false, length = 16) private String state;
    @Column(length = 7) private String period;
    @Column(nullable = false, length = 200) private String attentionKey;
    @Column(nullable = false, columnDefinition = "text") private String snapshot;
    @Column(nullable = false) private long revision;
    private Instant readAt;
    @Column(nullable = false) private Instant detectedAt;
    @Column(nullable = false) private Instant checkedAt;
    private Instant snoozedUntil;
    private Instant closedAt;
}
