package com.jr.finance.api.expense;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByUserId(Long userId);
    List<Category> findByUserIdOrderByNameAsc(Long userId);
    @EntityGraph(attributePaths = "parentCategory")
    List<Category> findByUserIdAndActiveOrderByNameAsc(Long userId, boolean active);
    List<Category> findByUserIdAndTypeOrderByNameAsc(Long userId, CategoryType type);
    @EntityGraph(attributePaths = "parentCategory")
    List<Category> findByUserIdAndTypeAndActiveOrderByNameAsc(Long userId, CategoryType type, boolean active);
    boolean existsByUserIdAndTypeAndNameIgnoreCase(Long userId, CategoryType type, String name);
    boolean existsByUserIdAndTypeAndNameIgnoreCaseAndIdNot(Long userId, CategoryType type, String name, Long id);
    Optional<Category> findByIdAndUserId(Long id, Long userId);

    @EntityGraph(attributePaths = "parentCategory")
    Optional<Category> findWithParentByIdAndUserId(Long id, Long userId);

    boolean existsByUserIdAndTypeAndParentCategoryIsNullAndNameIgnoreCase(Long userId, CategoryType type, String name);
    boolean existsByUserIdAndTypeAndParentCategoryIdAndNameIgnoreCase(Long userId, CategoryType type, Long parentId, String name);
    boolean existsByUserIdAndTypeAndParentCategoryIsNullAndNameIgnoreCaseAndIdNot(Long userId, CategoryType type, String name, Long id);
    boolean existsByUserIdAndTypeAndParentCategoryIdAndNameIgnoreCaseAndIdNot(Long userId, CategoryType type, Long parentId, String name, Long id);
    boolean existsByParentCategoryIdAndUserId(Long parentId, Long userId);
    boolean existsByParentCategoryIdAndUserIdAndActiveTrue(Long parentId, Long userId);
}
