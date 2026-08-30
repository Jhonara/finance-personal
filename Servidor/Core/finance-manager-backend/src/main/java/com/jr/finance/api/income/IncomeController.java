package com.jr.finance.api.income;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.income.dto.CreateIncomeRequest;
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
import com.jr.finance.api.income.dto.IncomeResponse;

import java.util.List;

@RestController
@RequestMapping("/api/v1/incomes")
@RequiredArgsConstructor
@Tag(
        name = "Income",
        description = "Operaciones para registrar y consultar los ingresos del usuario."
)
public class IncomeController {

    private final IncomeService incomeService;

    @Operation(
            summary = "Registrar un ingreso",
            description = "Registra un nuevo ingreso asociado al usuario autenticado."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Ingreso registrado correctamente"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado")
    })
    @PostMapping(
            consumes = "application/json",
            produces = "application/json"
    )
    public ResponseEntity<IncomeResponse> create(
            @Valid @RequestBody CreateIncomeRequest req,
            Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        return ResponseEntity.status(HttpStatus.CREATED).body(incomeService.create(userId, req));
    }

    @Operation(
            summary = "Listar ingresos por mes",
            description = "Obtiene todos los ingresos registrados por el usuario durante un mes específico."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Ingresos obtenidos correctamente"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado")
    })
    @GetMapping(
            value = "/month",
            produces = "application/json"
    )
    public List<IncomeResponse> listByMonth(

            @Parameter(
                    description = "Año a consultar.",
                    example = "2026"
            )
            @RequestParam int year,

            @Parameter(
                    description = "Mes a consultar (1-12).",
                    example = "7"
            )
            @RequestParam int month,

            Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        return incomeService.listByMonth(userId, year, month);
    }
}
