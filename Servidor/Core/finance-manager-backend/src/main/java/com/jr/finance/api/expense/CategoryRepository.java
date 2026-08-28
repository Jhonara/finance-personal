package com.jr.finance.api.expense;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByUserId(Long userId);
    boolean existsByUserIdAndNameIgnoreCase(Long userId, String name);
    Optional<Category> findByIdAndUserId(Long id, Long userId);
}
