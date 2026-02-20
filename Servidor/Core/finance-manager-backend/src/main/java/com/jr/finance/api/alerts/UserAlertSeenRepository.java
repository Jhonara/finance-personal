package com.jr.finance.api.alerts;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserAlertSeenRepository extends JpaRepository<UserAlertSeen, Long> {

    boolean existsByUserIdAndAlertCodeAndRelatedId(Long userId, String alertCode, Long relatedId);

    Optional<UserAlertSeen> findByUserIdAndAlertCodeAndRelatedId(Long userId, String alertCode, Long relatedId);
}
