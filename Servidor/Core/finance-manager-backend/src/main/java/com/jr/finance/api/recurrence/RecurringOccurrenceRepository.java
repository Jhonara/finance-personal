package com.jr.finance.api.recurrence;

import org.springframework.data.jpa.repository.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface RecurringOccurrenceRepository extends JpaRepository<RecurringOccurrence, Long> {
    long countByRuleUserIdAndStatus(Long userId, RecurringOccurrence.Status status);
    Optional<RecurringOccurrence> findByRuleIdAndDueDate(Long ruleId, LocalDate dueDate);
    @Query("""
        select o from RecurringOccurrence o where o.rule.user.id = :userId and
        (o.dueDate between :start and :end or (o.status = 'PENDING' and o.dueDate < :start))
        order by o.dueDate, o.id
        """)
    List<RecurringOccurrence> agenda(Long userId, LocalDate start, LocalDate end);
}
