package com.jr.finance.api.expense;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.expense.dto.CategoryResponse;
import com.jr.finance.api.expense.dto.CreateCategoryRequest;
import com.jr.finance.api.expense.mapper.CategoryMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
@Tag(
        name = "Categorías",
        description = "Operaciones para administrar las categorías de gastos del usuario."
)
public class CategoryController {

    private final CategoryService categoryService;
    private final CategoryMapper categoryMapper;

    @Operation(
            summary = "Crear una categoría",
            description = "Crea una nueva categoría personalizada para clasificar los gastos del usuario."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Categoría creada correctamente"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado"),
            @ApiResponse(responseCode = "409", description = "Ya existe una categoría con ese nombre")
    })
    @PostMapping(
            consumes = "application/json",
            produces = "application/json"
    )
    public CategoryResponse create(
            @Valid @RequestBody CreateCategoryRequest req,
            Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        Category category = categoryService.create(userId, req.getName());

        return categoryMapper.toResponse(category);
    }

    @Operation(
            summary = "Listar categorías",
            description = "Obtiene todas las categorías registradas por el usuario autenticado."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Categorías obtenidas correctamente"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado")
    })
    @GetMapping(produces = "application/json")
    public List<CategoryResponse> list(Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        List<Category> categories = categoryService.listByUser(userId);

        return categoryMapper.toResponseList(categories);
    }

    @Operation(
            summary = "Eliminar una categoría",
            description = "Elimina una categoría perteneciente al usuario autenticado."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Categoría eliminada correctamente"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado"),
            @ApiResponse(responseCode = "404", description = "Categoría no encontrada")
    })
    @DeleteMapping("/{id}")
    public void delete(
            @Parameter(
                    description = "Identificador de la categoría.",
                    example = "1"
            )
            @PathVariable Long id,
            Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        categoryService.delete(userId, id);
    }
}