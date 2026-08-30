package com.jr.finance.api.expense;

import com.jr.finance.api.common.exception.ConflictException;
import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.common.exception.BadRequestException;
import com.jr.finance.api.expense.dto.UpdateCategoryRequest;
import com.jr.finance.api.user.User;
import com.jr.finance.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    @Transactional
    public Category create(Long userId, String name, CategoryType type) {

        log.info("Creando categoría '{}' para el usuario {}.", name, userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.warn("Usuario {} no encontrado al crear una categoría.", userId);
                    return new NotFoundException("El usuario no existe");
                });

        String normalizedName = normalizeName(name);
        if (categoryRepository.existsByUserIdAndTypeAndNameIgnoreCase(userId, type, normalizedName)) {
            log.warn("El usuario {} intentó crear una categoría duplicada: {}.", userId, name);
            throw new ConflictException("Ya existe una categoría con ese nombre");
        }

        Category category = new Category();
        category.setName(normalizedName);
        category.setType(type);
        category.setActive(true);
        category.setUser(user);

        Category savedCategory = categoryRepository.save(category);

        log.info("Categoría {} creada correctamente para el usuario {}.",
                savedCategory.getId(),
                userId);

        return savedCategory;
    }

    public List<Category> listByUser(Long userId, CategoryType type, Boolean active) {

        log.info("Consultando categorías del usuario {}.", userId);

        boolean effectiveActive = active == null || active;
        if (type != null) {
            return categoryRepository.findByUserIdAndTypeAndActiveOrderByNameAsc(userId, type, effectiveActive);
        }
        return categoryRepository.findByUserIdAndActiveOrderByNameAsc(userId, effectiveActive);
    }

    public Category get(Long userId, Long categoryId) {
        return categoryRepository.findByIdAndUserId(categoryId, userId)
                .orElseThrow(() -> new NotFoundException("La categoría no existe"));
    }

    @Transactional
    public void deactivate(Long userId, Long categoryId) {

        log.info("Desactivando categoría {} del usuario {}.", categoryId, userId);

        Category category = get(userId, categoryId);
        category.setActive(false);
        categoryRepository.saveAndFlush(category);

        log.info("Categoría {} desactivada correctamente.", categoryId);
    }

    @Transactional
    public Category update(Long userId, Long categoryId, UpdateCategoryRequest request) {
        Category category = get(userId, categoryId);
        if (!category.getVersion().equals(request.getVersion())) {
            throw new ConflictException("La categoría fue modificada por otra operación. Intenta nuevamente.");
        }
        if (request.getName() == null && request.getActive() == null) {
            throw new BadRequestException("Debes enviar al menos un campo editable");
        }
        if (request.getName() != null) {
            String normalizedName = normalizeName(request.getName());
            if (categoryRepository.existsByUserIdAndTypeAndNameIgnoreCaseAndIdNot(userId, category.getType(), normalizedName, categoryId)) {
                throw new ConflictException("Ya existe una categoría con ese nombre y tipo");
            }
            category.setName(normalizedName);
        }
        if (request.getActive() != null) {
            category.setActive(request.getActive());
        }
        return categoryRepository.saveAndFlush(category);
    }

    private String normalizeName(String name) {
        String normalized = name == null ? "" : name.trim();
        if (normalized.isEmpty() || normalized.length() > 100) {
            throw new BadRequestException("El nombre de la categoría debe tener entre 1 y 100 caracteres");
        }
        return normalized;
    }
}
