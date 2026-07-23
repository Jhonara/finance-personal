package com.jr.finance.api.saving;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.saving.dto.AddSavingMovementRequest;
import com.jr.finance.api.saving.dto.CreateSavingGoalRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/savings")
@RequiredArgsConstructor
@Tag(
        name = "Metas de Ahorro",
        description = "Operaciones para administrar metas de ahorro y registrar aportes."
)
public class SavingController {

    private final SavingService savingService;

    @Operation(
            summary = "Crear una meta de ahorro",
            description = "Crea una nueva meta de ahorro para el usuario autenticado."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Meta creada correctamente"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado")
    })
    @PostMapping(
            value = "/goals",
            consumes = "application/json",
            produces = "application/json"
    )
    public SavingGoal createGoal(
            @Valid @RequestBody CreateSavingGoalRequest req,
            Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        return savingService.createGoal(userId, req);
    }

    @Operation(
            summary = "Listar metas de ahorro",
            description = "Obtiene todas las metas de ahorro registradas por el usuario autenticado."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Metas obtenidas correctamente"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado")
    })
    @GetMapping(
            value = "/goals",
            produces = "application/json"
    )
    public List<SavingGoal> listGoals(Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        return savingService.listGoals(userId);
    }

    @Operation(
            summary = "Registrar un aporte",
            description = "Registra un nuevo aporte a una meta de ahorro existente."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Aporte registrado correctamente"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado"),
            @ApiResponse(responseCode = "404", description = "Meta de ahorro no encontrada")
    })
    @PostMapping(
            value = "/goals/{id}/movements",
            consumes = "application/json",
            produces = "application/json"
    )
    public SavingGoal addMovement(

            @Parameter(
                    description = "Identificador de la meta de ahorro.",
                    example = "1"
            )
            @PathVariable Long id,

            @Valid @RequestBody AddSavingMovementRequest req,

            Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        return savingService.addMovement(userId, id, req);
    }

    @Operation(
            summary = "Consultar progreso de una meta",
            description = "Obtiene el porcentaje de progreso alcanzado en una meta de ahorro."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Progreso calculado correctamente"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado"),
            @ApiResponse(responseCode = "404", description = "Meta de ahorro no encontrada")
    })
    @GetMapping(
            value = "/goals/{id}/progress",
            produces = "application/json"
    )
    public BigDecimal progress(

            @Parameter(
                    description = "Identificador de la meta de ahorro.",
                    example = "1"
            )
            @PathVariable Long id,

            Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        SavingGoal goal = savingService.listGoals(userId).stream()
                .filter(g -> g.getId().equals(id))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Saving goal not found"));

        return savingService.progressPercentage(goal);
    }
}