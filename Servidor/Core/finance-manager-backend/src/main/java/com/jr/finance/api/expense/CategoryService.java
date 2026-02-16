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
                .orElseThrow(() -> new RuntimeException("User not found"));

        Category c = new Category();
        c.setName(name);
        c.setUser(user);

        return categoryRepository.save(c);
    }

    public List<Category> listByUser(Long userId) {
        return categoryRepository.findByUserId(userId);
    }

    public void delete(Long userId, Long categoryId) {
        Category c = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new NotFoundException("La categoría no existe"));

        if (!c.getUser().getId().equals(userId)) {
            throw new NotFoundException("La categoría no existe");
        }

        categoryRepository.delete(c);
    }
}
