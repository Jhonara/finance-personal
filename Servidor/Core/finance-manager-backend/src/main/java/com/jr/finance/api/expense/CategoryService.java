package com.jr.finance.api.expense;

import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.user.User;
import com.jr.finance.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    public Category create(Long userId, String name) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("El usuario no existe"));

        if (categoryRepository.existsByUserIdAndNameIgnoreCase(userId, name)) {
            throw new IllegalArgumentException("Ya existe una categoría con ese nombre");
        }

        Category category = new Category();
        category.setName(name);
        category.setUser(user);

        return categoryRepository.save(category);
    }

    public List<Category> listByUser(Long userId) {
        return categoryRepository.findByUserId(userId);
    }

    public void delete(Long userId, Long categoryId) {

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new NotFoundException("La categoría no existe"));

        if (!category.getUser().getId().equals(userId)) {
            throw new NotFoundException("La categoría no existe");
        }

        categoryRepository.delete(category);
    }
}