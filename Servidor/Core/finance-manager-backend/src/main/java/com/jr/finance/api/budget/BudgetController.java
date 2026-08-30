package com.jr.finance.api.budget;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.budget.dto.BudgetResponse;
import com.jr.finance.api.budget.dto.CreateBudgetRequest;
import com.jr.finance.api.budget.dto.UpdateBudgetRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/budgets")
@RequiredArgsConstructor
@Tag(name = "Budgets", description = "Límites mensuales por categoría; los importes gastados se derivan del ledger.")
public class BudgetController {

    private final BudgetService budgetService;

    @PostMapping
    @Operation(summary = "Crear presupuesto", description = "Crea un límite por categoría y período. Un presupuesto duplicado para el mismo usuario, categoría y mes genera conflicto.")
    @ApiResponses({@ApiResponse(responseCode = "201", description = "Presupuesto creado"), @ApiResponse(responseCode = "400", description = "Solicitud inválida"), @ApiResponse(responseCode = "409", description = "Presupuesto duplicado")})
    public ResponseEntity<BudgetResponse> create(@Valid @RequestBody CreateBudgetRequest request,
                                                 Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(budgetService.create(userId(authentication), request));
    }

    @GetMapping
    @Operation(summary = "Listar presupuestos", description = "Permite filtrar por año y mes. spent, remaining, percentage y status se calculan al consultar.")
    public List<BudgetResponse> list(@RequestParam(required = false) Integer year,
                                     @RequestParam(required = false) Integer month,
                                     Authentication authentication) {
        return budgetService.list(userId(authentication), year, month);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consultar presupuesto", description = "Obtiene un presupuesto propio con sus valores derivados para el período.")
    public BudgetResponse get(@PathVariable Long id, Authentication authentication) {
        return budgetService.get(userId(authentication), id);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Actualizar presupuesto", description = "Actualiza el límite usando la versión recibida para controlar concurrencia optimista.")
    @ApiResponses({@ApiResponse(responseCode = "200", description = "Presupuesto actualizado"), @ApiResponse(responseCode = "404", description = "Presupuesto inexistente"), @ApiResponse(responseCode = "409", description = "Versión desactualizada")})
    public BudgetResponse update(@PathVariable Long id, @Valid @RequestBody UpdateBudgetRequest request,
                                 Authentication authentication) {
        return budgetService.update(userId(authentication), id, request);
    }

    private Long userId(Authentication authentication) {
        return ((UserPrincipal) authentication.getPrincipal()).getUser().getId();
    }
}
