package com.jr.finance.api.expense.mapper;

import com.jr.finance.api.expense.Category;
import com.jr.finance.api.expense.dto.CategoryResponse;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class CategoryMapper {

    public CategoryResponse toResponse(Category category) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getType(),
                category.isActive(),
                category.getCreatedAt(),
                category.getUpdatedAt(),
                category.getVersion()
        );
    }

    public List<CategoryResponse> toResponseList(List<Category> categories) {
        return categories.stream()
                .map(this::toResponse)
                .toList();
    }
}
