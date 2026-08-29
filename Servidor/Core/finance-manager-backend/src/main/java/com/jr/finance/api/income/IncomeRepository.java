package com.jr.finance.api.income;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Pageable;

public interface IncomeRepository extends JpaRepository<Income, Long> {

    @Query("""
        select i from Income i where i.user.id = :userId and i.incomeDate between :start and :end
          and not exists (select 1 from FinancialTransaction f
              where f.legacySource = com.jr.finance.api.ledger.LegacyOperationSource.INCOME and f.legacyId = i.id)
    """)
    List<Income> findUnmigratedByUserIdAndIncomeDateBetween(Long userId, LocalDate start, LocalDate end);

    @Query("""
        SELECT COALESCE(SUM(i.amount), 0)
        FROM Income i
        WHERE i.user.id = :userId
          AND i.incomeDate BETWEEN :start AND :end
          AND NOT EXISTS (SELECT 1 FROM FinancialTransaction f
              WHERE f.legacySource = com.jr.finance.api.ledger.LegacyOperationSource.INCOME AND f.legacyId = i.id)
    """)
    BigDecimal totalByPeriod(
            @Param("userId") Long userId,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end
    );

    @Query("""
        select i from Income i where not exists (select 1 from FinancialTransaction f
          where f.legacySource = com.jr.finance.api.ledger.LegacyOperationSource.INCOME and f.legacyId = i.id)
        order by i.id
    """)
    List<Income> findUnmigrated(Pageable pageable);

    @Query("""
        select i from Income i where i.id > :afterId and not exists (select 1 from FinancialTransaction f
          where f.legacySource = com.jr.finance.api.ledger.LegacyOperationSource.INCOME and f.legacyId = i.id)
        order by i.id
    """)
    List<Income> findUnmigratedAfterId(Long afterId, Pageable pageable);
}
