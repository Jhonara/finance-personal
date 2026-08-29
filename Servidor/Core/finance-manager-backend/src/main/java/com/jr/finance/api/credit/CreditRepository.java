package com.jr.finance.api.credit;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CreditRepository extends JpaRepository<Credit, Long> {
    List<Credit> findByUserId(Long userId);

    List<Credit> findByUserIdOrderByCreatedAtAscIdAsc(Long userId);
}
