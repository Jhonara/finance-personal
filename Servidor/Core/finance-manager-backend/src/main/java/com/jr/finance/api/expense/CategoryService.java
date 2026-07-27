package com.jr.finance.api.expense;

import com.jr.finance.api.common.exception.ConflictException;
import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.user.User;
import com.jr.finance.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    public Category create(Long userId, String name) {

        log.info("Creando categoría '{}' para el usuario {}.", name, userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.warn("Usuario {} no encontrado al crear una categoría.", userId);
                    return new NotFoundException("El usuario no existe");
                });

        if (categoryRepository.existsByUserIdAndNameIgnoreCase(userId, name)) {
            log.warn("El usuario {} intentó crear una categoría duplicada: {}.", userId, name);
            throw new ConflictException("Ya existe una categoría con ese nombre");
        }

        Category category = new Category();
        category.setName(name);
        category.setUser(user);

        Category savedCategory = categoryRepository.save(category);

        log.info("Categoría {} creada correctamente para el usuario {}.",
                savedCategory.getId(),
                userId);

        return savedCategory;
    }

    public List<Category> listByUser(Long userId) {

        log.info("Consultando categorías del usuario {}.", userId);

        return categoryRepository.findByUserId(userId);
    }

    public void delete(Long userId, Long categoryId) {

        log.info("Eliminando categoría {} del usuario {}.", categoryId, userId);

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> {
                    log.warn("Categoría {} no encontrada.", categoryId);
                    return new NotFoundException("La categoría no existe");
                });

        if (!category.getUser().getId().equals(userId)) {
            log.warn("El usuario {} intentó eliminar la categoría {} sin permisos.",
                    userId,
                    categoryId);

            throw new NotFoundException("La categoría no existe");
        }

        categoryRepository.delete(category);

        log.info("Categoría {} eliminada correctamente.", categoryId);
    }
}