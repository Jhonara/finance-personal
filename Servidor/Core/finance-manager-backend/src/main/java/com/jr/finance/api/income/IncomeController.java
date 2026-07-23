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
import org.springframework.web.bind.annotation.*;
import com.jr.finance.api.income.dto.IncomeResponse;
import com.jr.finance.api.income.mapper.IncomeMapper;

import java.util.List;

@RestController
@RequestMapping("/api/incomes")
@RequiredArgsConstructor
@Tag(
        name = "Ingresos",
        description = "Operaciones para registrar y consultar los ingresos del usuario."
)
public class IncomeController {

    private final IncomeService incomeService;
    private final IncomeMapper incomeMapper;

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
    public IncomeResponse create(
            @Valid @RequestBody CreateIncomeRequest req,
            Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        return incomeMapper.toResponse(
                incomeService.create(userId, req)
        );
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

        return incomeMapper.toResponseList(
                incomeService.listByMonth(userId, year, month)
        );
    }
}