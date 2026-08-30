package com.jr.finance.api.credit;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.List;

public interface CreditRepository extends JpaRepository<Credit, Long> {
    List<Credit> findByUserId(Long userId);

    List<Credit> findByUserIdOrderByCreatedAtAscIdAsc(Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    java.util.Optional<Credit> findWithLockByIdAndUserId(Long id, Long userId);
}
