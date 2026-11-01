package com.jr.finance.api.expense;

import com.jr.finance.api.common.exception.ConflictException;
import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.common.exception.BadRequestException;
import com.jr.finance.api.expense.dto.UpdateCategoryRequest;
import org.springframework.dao.DataIntegrityViolationException;
import com.jr.finance.api.expense.CategoryType;
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
    public Category create(Long userId, String name, CategoryType type, String iconKey, String colorKey) {
        return create(userId, name, type, iconKey, colorKey, null);
    }

    @Transactional
    public Category create(Long userId, String name, CategoryType type, String iconKey, String colorKey,
                           Long parentCategoryId) {

        log.info("Creando categoría '{}' para el usuario {}.", name, userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.warn("Usuario {} no encontrado al crear una categoría.", userId);
                    return new NotFoundException("El usuario no existe");
                });

        String normalizedName = normalizeName(name);
        Category parent = resolveParent(userId, type, parentCategoryId, null);
        if (nameExists(userId, type, parent, normalizedName, null)) {
            log.warn("El usuario {} intentó crear una categoría duplicada: {}.", userId, name);
            throw new ConflictException("Ya existe una categoría hermana con ese nombre");
        }

        Category category = new Category();
        category.setName(normalizedName);
        category.setType(type);
        category.setActive(true);
        category.setIconKey(normalizeVisualKey(iconKey, 40));
        category.setColorKey(normalizeVisualKey(colorKey, 24));
        category.setUser(user);
        category.setParentCategory(parent);

        Category savedCategory;
        try {
            savedCategory = categoryRepository.saveAndFlush(category);
        } catch (DataIntegrityViolationException exception) {
            throw new ConflictException("Ya existe una categoría hermana con ese nombre");
        }

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
        return categoryRepository.findWithParentByIdAndUserId(categoryId, userId)
                .orElseThrow(() -> new NotFoundException("La categoría no existe"));
    }

    @Transactional
    public void deactivate(Long userId, Long categoryId) {

        log.info("Desactivando categoría {} del usuario {}.", categoryId, userId);

        Category category = get(userId, categoryId);
        if (categoryRepository.existsByParentCategoryIdAndUserIdAndActiveTrue(categoryId, userId)) {
            throw new ConflictException("Reasigna o desactiva primero las subcategorías activas");
        }
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
        if (request.getName() == null && request.getActive() == null && request.getIconKey() == null
                && request.getColorKey() == null && request.getParentCategoryId() == null
                && !Boolean.TRUE.equals(request.getClearParent())) {
            throw new BadRequestException("Debes enviar al menos un campo editable");
        }
        Category destination = category.getParentCategory();
        if (Boolean.TRUE.equals(request.getClearParent())) {
            destination = null;
        } else if (request.getParentCategoryId() != null) {
            destination = resolveParent(userId, category.getType(), request.getParentCategoryId(), categoryId);
        }
        if (request.getName() != null) {
            String normalizedName = normalizeName(request.getName());
            if (nameExists(userId, category.getType(), destination, normalizedName, categoryId)) {
                throw new ConflictException("Ya existe una categoría hermana con ese nombre");
            }
            category.setName(normalizedName);
        } else if ((Boolean.TRUE.equals(request.getClearParent()) || request.getParentCategoryId() != null)
                && nameExists(userId, category.getType(), destination, category.getName(), categoryId)) {
            throw new ConflictException("Ya existe una categoría hermana con ese nombre");
        }
        if (destination != category.getParentCategory()) {
            if (categoryRepository.existsByParentCategoryIdAndUserId(categoryId, userId)) {
                throw new BadRequestException("Una categoría con subcategorías no puede convertirse en subcategoría");
            }
            category.setParentCategory(destination);
        }
        if (request.getActive() != null) {
            if (request.getActive() && destination != null && !destination.isActive()) {
                throw new BadRequestException("Activa primero la categoría padre");
            }
            if (!request.getActive() && categoryRepository.existsByParentCategoryIdAndUserIdAndActiveTrue(categoryId, userId)) {
                throw new ConflictException("Reasigna o desactiva primero las subcategorías activas");
            }
            category.setActive(request.getActive());
        }
        if (request.getIconKey() != null) category.setIconKey(normalizeVisualKey(request.getIconKey(), 40));
        if (request.getColorKey() != null) category.setColorKey(normalizeVisualKey(request.getColorKey(), 24));
        try {
            return categoryRepository.saveAndFlush(category);
        } catch (DataIntegrityViolationException exception) {
            throw new ConflictException("Ya existe una categoría hermana con ese nombre");
        }
    }

    private Category resolveParent(Long userId, CategoryType type, Long parentCategoryId, Long categoryId) {
        if (parentCategoryId == null) return null;
        if (parentCategoryId.equals(categoryId)) {
            throw new BadRequestException("Una categoría no puede ser su propio padre");
        }
        Category parent = categoryRepository.findWithParentByIdAndUserId(parentCategoryId, userId)
                .orElseThrow(() -> new NotFoundException("La categoría padre no existe"));
        if (parent.getType() != type) {
            throw new BadRequestException("La categoría padre debe ser del mismo tipo");
        }
        if (!parent.isActive()) {
            throw new BadRequestException("La categoría padre está inactiva");
        }
        if (parent.getParentCategory() != null) {
            throw new BadRequestException("Solo se permiten categorías padre y subcategorías");
        }
        return parent;
    }

    private boolean nameExists(Long userId, CategoryType type, Category parent, String name, Long excludingId) {
        if (parent == null) {
            return excludingId == null
                    ? categoryRepository.existsByUserIdAndTypeAndParentCategoryIsNullAndNameIgnoreCase(userId, type, name)
                    : categoryRepository.existsByUserIdAndTypeAndParentCategoryIsNullAndNameIgnoreCaseAndIdNot(userId, type, name, excludingId);
        }
        return excludingId == null
                ? categoryRepository.existsByUserIdAndTypeAndParentCategoryIdAndNameIgnoreCase(userId, type, parent.getId(), name)
                : categoryRepository.existsByUserIdAndTypeAndParentCategoryIdAndNameIgnoreCaseAndIdNot(userId, type, parent.getId(), name, excludingId);
    }

    private String normalizeVisualKey(String value, int maxLength) {
        if (value == null) return null;
        String normalized = value.trim();
        if (normalized.length() > maxLength || !normalized.matches("[a-z0-9-]+")) {
            throw new BadRequestException("El ícono o color elegido no es válido");
        }
        return normalized;
    }

    private String normalizeName(String name) {
        String normalized = name == null ? "" : name.trim();
        if (normalized.isEmpty() || normalized.length() > 100) {
            throw new BadRequestException("El nombre de la categoría debe tener entre 1 y 100 caracteres");
        }
        return normalized;
    }
}
