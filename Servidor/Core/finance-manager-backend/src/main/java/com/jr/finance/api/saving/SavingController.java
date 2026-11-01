package com.jr.finance.api.saving;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.saving.dto.AddSavingMovementRequest;
import com.jr.finance.api.saving.dto.AssignSavingCurrencyRequest;
import com.jr.finance.api.saving.dto.CreateSavingGoalRequest;
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
import com.jr.finance.api.saving.dto.SavingGoalResponse;
import com.jr.finance.api.saving.mapper.SavingGoalMapper;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/savings")
@RequiredArgsConstructor
@Tag(
        name = "Savings",
        description = "Operaciones para administrar metas de ahorro y registrar aportes."
)
public class SavingController {

    private final SavingService savingService;
    private final SavingGoalMapper savingGoalMapper;

    @GetMapping("/goals/{id}")
    public SavingGoalResponse detail(@PathVariable Long id, Authentication auth) {
        return savingGoalMapper.toResponse(savingService.get(userId(auth), id));
    }

    @PutMapping("/goals/{id}")
    public SavingGoalResponse update(@PathVariable Long id, @Valid @RequestBody com.jr.finance.api.saving.dto.UpdateSavingGoalRequest req, Authentication auth) {
        return savingGoalMapper.toResponse(savingService.update(userId(auth), id, req));
    }

    @PatchMapping("/goals/{id}/status")
    public SavingGoalResponse status(@PathVariable Long id, @Valid @RequestBody com.jr.finance.api.saving.dto.ChangeSavingStatusRequest req, Authentication auth) {
        return savingGoalMapper.toResponse(savingService.changeStatus(userId(auth), id, req));
    }

    @DeleteMapping("/goals/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @RequestParam Long version, Authentication auth) {
        savingService.deleteEmpty(userId(auth), id, version); return ResponseEntity.noContent().build();
    }

    @GetMapping("/goals/{id}/movements")
    public List<com.jr.finance.api.saving.dto.SavingMovementResponse> movements(@PathVariable Long id, Authentication auth) {
        return savingService.movements(userId(auth), id);
    }

    @PostMapping("/goals/{id}/withdrawals")
    @Operation(summary = "Anotar retiro de una meta", description = "Reduce el ahorro informativo; no mueve dinero entre cuentas. Conserva el historial y exige versión vigente.")
    public SavingGoalResponse withdraw(@PathVariable Long id, @Valid @RequestBody AddSavingMovementRequest req, Authentication auth) {
        return savingGoalMapper.toResponse(savingService.withdraw(userId(auth), id, req));
    }

    private Long userId(Authentication auth) { return ((UserPrincipal) auth.getPrincipal()).getUser().getId(); }

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
    public ResponseEntity<SavingGoalResponse> createGoal(
            @Valid @RequestBody CreateSavingGoalRequest req,
            Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        return ResponseEntity.status(HttpStatus.CREATED).body(savingGoalMapper.toResponse(savingService.createGoal(userId, req)));
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
    public List<SavingGoalResponse> listGoals(Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        return savingGoalMapper.toResponseList(
                savingService.listGoals(userId)
        );
    }

    @PatchMapping(value = "/goals/{id}/currency", consumes = "application/json", produces = "application/json")
    public SavingGoalResponse assignCurrency(@PathVariable Long id,
                                             @Valid @RequestBody AssignSavingCurrencyRequest request,
                                             Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        return savingGoalMapper.toResponse(
                savingService.assignCurrency(principal.getUser().getId(), id, request.currency()));
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
    public SavingGoalResponse addMovement(

            @Parameter(
                    description = "Identificador de la meta de ahorro.",
                    example = "1"
            )
            @PathVariable Long id,

            @Valid @RequestBody AddSavingMovementRequest req,

            Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        return savingGoalMapper.toResponse(
                savingService.addMovement(userId, id, req)
        );
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
