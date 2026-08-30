package com.jr.finance.api.expense;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.expense.dto.CategoryResponse;
import com.jr.finance.api.expense.dto.CreateCategoryRequest;
import com.jr.finance.api.expense.dto.UpdateCategoryRequest;
import com.jr.finance.api.expense.mapper.CategoryMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/categories")
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
    public ResponseEntity<CategoryResponse> create(
            @Valid @RequestBody CreateCategoryRequest req,
            Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        Category category = categoryService.create(userId, req.getName(), req.getType());

        return ResponseEntity.status(HttpStatus.CREATED).body(categoryMapper.toResponse(category));
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
    public List<CategoryResponse> list(@RequestParam(required = false) CategoryType type,
                                       @RequestParam(required = false) Boolean active,
                                       Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        List<Category> categories = categoryService.listByUser(userId, type, active);

        return categoryMapper.toResponseList(categories);
    }

    @GetMapping(value = "/{id}", produces = "application/json")
    @Operation(summary = "Consultar una categoría propia")
    @ApiResponses(@ApiResponse(responseCode = "404", description = "Categoría inexistente o ajena"))
    public CategoryResponse get(@PathVariable Long id, Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        return categoryMapper.toResponse(categoryService.get(principal.getUser().getId(), id));
    }

    @PatchMapping(value = "/{id}", consumes = "application/json", produces = "application/json")
    @Operation(summary = "Actualizar nombre o estado de una categoría propia")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Categoría actualizada"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos"),
            @ApiResponse(responseCode = "404", description = "Categoría inexistente o ajena"),
            @ApiResponse(responseCode = "409", description = "Nombre duplicado o versión obsoleta")
    })
    public CategoryResponse update(@PathVariable Long id, @Valid @RequestBody UpdateCategoryRequest request,
                                   Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        return categoryMapper.toResponse(categoryService.update(principal.getUser().getId(), id, request));
    }

    @Operation(
            summary = "Eliminar una categoría",
            description = "Desactiva una categoría perteneciente al usuario autenticado; el historial se conserva."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Categoría eliminada correctamente"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado"),
            @ApiResponse(responseCode = "404", description = "Categoría no encontrada")
    })
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @Parameter(
                    description = "Identificador de la categoría.",
                    example = "1"
            )
            @PathVariable Long id,
            Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        categoryService.deactivate(userId, id);
    }
}
