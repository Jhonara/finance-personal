package com.jr.finance.api.alerts;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Schema(
        description = "Representa una alerta que ya fue visualizada por un usuario."
)
@Entity
@Table(name = "user_alerts_seen",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "alert_code", "related_id"}))
@Data
public class UserAlertSeen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "alert_code", nullable = false, length = 50)
    private String alertCode;

    @Column(name = "related_id")
    private Long relatedId;

    @Column(name = "seen_at")
    private LocalDateTime seenAt;
}