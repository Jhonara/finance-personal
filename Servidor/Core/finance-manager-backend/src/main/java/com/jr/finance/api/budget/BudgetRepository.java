package com.jr.finance.api.budget;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BudgetRepository extends JpaRepository<Budget, Long> {

    boolean existsByUserIdAndCategoryIdAndYearAndMonth(Long userId, Long categoryId, int year, int month);

    long countByUserIdAndCategoryIdAndYearAndMonth(Long userId, Long categoryId, int year, int month);

    List<Budget> findByUserIdOrderByYearDescMonthDescCategoryNameAsc(Long userId);

    List<Budget> findByUserIdAndYearAndMonthOrderByCategoryNameAsc(Long userId, int year, int month);

    Optional<Budget> findByIdAndUserId(Long id, Long userId);
}
