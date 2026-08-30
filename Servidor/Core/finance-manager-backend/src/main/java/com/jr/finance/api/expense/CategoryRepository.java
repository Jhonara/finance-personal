package com.jr.finance.api.expense;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByUserId(Long userId);
    List<Category> findByUserIdOrderByNameAsc(Long userId);
    List<Category> findByUserIdAndActiveOrderByNameAsc(Long userId, boolean active);
    List<Category> findByUserIdAndTypeOrderByNameAsc(Long userId, CategoryType type);
    List<Category> findByUserIdAndTypeAndActiveOrderByNameAsc(Long userId, CategoryType type, boolean active);
    boolean existsByUserIdAndTypeAndNameIgnoreCase(Long userId, CategoryType type, String name);
    boolean existsByUserIdAndTypeAndNameIgnoreCaseAndIdNot(Long userId, CategoryType type, String name, Long id);
    Optional<Category> findByIdAndUserId(Long id, Long userId);
}
