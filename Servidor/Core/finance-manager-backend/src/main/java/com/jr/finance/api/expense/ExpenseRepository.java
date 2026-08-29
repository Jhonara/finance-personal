package com.jr.finance.api.expense;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Pageable;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    @Query("""
        select e from Expense e where e.user.id = :userId and e.expenseDate between :start and :end
          and not exists (select 1 from FinancialTransaction f
              where f.legacySource = com.jr.finance.api.ledger.LegacyOperationSource.EXPENSE and f.legacyId = e.id)
    """)
    List<Expense> findUnmigratedByUserIdAndExpenseDateBetween(Long userId, LocalDate start, LocalDate end);

    @Query("""
        SELECT COALESCE(SUM(e.amount), 0)
        FROM Expense e
        WHERE e.user.id = :userId
          AND e.expenseDate BETWEEN :start AND :end
          AND NOT EXISTS (SELECT 1 FROM FinancialTransaction f
              WHERE f.legacySource = com.jr.finance.api.ledger.LegacyOperationSource.EXPENSE AND f.legacyId = e.id)
    """)
    BigDecimal totalByPeriod(
            @Param("userId") Long userId,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end
    );

    @Query("""
        SELECT COALESCE(SUM(e.amount), 0)
        FROM Expense e
        WHERE e.user.id = :userId
          AND e.expenseType = :type
          AND e.expenseDate BETWEEN :start AND :end
          AND NOT EXISTS (SELECT 1 FROM FinancialTransaction f
              WHERE f.legacySource = com.jr.finance.api.ledger.LegacyOperationSource.EXPENSE AND f.legacyId = e.id)
    """)
    BigDecimal totalByType(
            @Param("userId") Long userId,
            @Param("type") String type,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end
    );

    @Query("""
        SELECT c.name, COALESCE(SUM(e.amount), 0)
        FROM Expense e
        LEFT JOIN e.category c
        WHERE e.user.id = :userId
          AND e.expenseDate BETWEEN :start AND :end
          AND NOT EXISTS (SELECT 1 FROM FinancialTransaction f
              WHERE f.legacySource = com.jr.finance.api.ledger.LegacyOperationSource.EXPENSE AND f.legacyId = e.id)
        GROUP BY c.name
    """)
    List<Object[]> totalByCategory(
            @Param("userId") Long userId,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end
    );

    @Query("""
        select e from Expense e where not exists (select 1 from FinancialTransaction f
          where f.legacySource = com.jr.finance.api.ledger.LegacyOperationSource.EXPENSE and f.legacyId = e.id)
        order by e.id
    """)
    List<Expense> findUnmigrated(Pageable pageable);

    @Query("""
        select e from Expense e where e.id > :afterId and not exists (select 1 from FinancialTransaction f
          where f.legacySource = com.jr.finance.api.ledger.LegacyOperationSource.EXPENSE and f.legacyId = e.id)
        order by e.id
    """)
    List<Expense> findUnmigratedAfterId(Long afterId, Pageable pageable);
}
