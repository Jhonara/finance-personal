package com.jr.finance.api.expense;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findByUserIdAndExpenseDateBetween(Long userId, LocalDate start, LocalDate end);



    @Query("""
        SELECT COALESCE(SUM(e.amount), 0)
        FROM Expense e
        WHERE e.user.id = :userId
          AND e.expenseDate BETWEEN :start AND :end
    """)
    BigDecimal totalByPeriod(@Param("userId") Long userId,
                             @Param("start") LocalDate start,
                             @Param("end") LocalDate end);

    @Query("""
        SELECT COALESCE(SUM(e.amount), 0)
        FROM Expense e
        WHERE e.user.id = :userId
          AND e.expenseType = :type
          AND e.expenseDate BETWEEN :start AND :end
    """)
    BigDecimal totalByType(@Param("userId") Long userId,
                           @Param("type") String type,
                           @Param("start") LocalDate start,
                           @Param("end") LocalDate end);

    @Query("""
        SELECT c.name, COALESCE(SUM(e.amount), 0)
        FROM Expense e
        LEFT JOIN e.category c
        WHERE e.user.id = :userId
          AND e.expenseDate BETWEEN :start AND :end
        GROUP BY c.name
    """)
    List<Object[]> totalByCategory(@Param("userId") Long userId,
                                   @Param("start") LocalDate start,
                                   @Param("end") LocalDate end);
}
