package com.jr.finance.api.recurrence;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface RecurringRuleRepository extends JpaRepository<RecurringRule, Long> {
    List<RecurringRule> findByUserIdOrderByActiveDescNameAsc(Long userId);
    Optional<RecurringRule> findByUserIdAndRequestKey(Long userId, String requestKey);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from RecurringRule r where r.id = :id")
    Optional<RecurringRule> lock(Long id);
    @Query("select r.id from RecurringRule r where r.active = true and r.nextDate <= :date order by r.nextDate, r.id")
    List<Long> dueIds(LocalDate date);
}
