package com.jr.finance.api.dashboard;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.dashboard.dto.DashboardMonthResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@Tag(
        name = "Dashboard",
        description = "Operaciones para consultar el resumen financiero del usuario."
)
public class DashboardController {

    private final DashboardService dashboardService;

    @Operation(
            summary = "Obtener dashboard mensual",
            description = "Retorna un resumen financiero del mes seleccionado, incluyendo ingresos, gastos, balance, categorías principales, metas de ahorro, alertas, créditos y un resumen generado por IA."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Dashboard obtenido correctamente"),
            @ApiResponse(responseCode = "400", description = "Parámetros inválidos"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado")
    })
    @GetMapping(
            value = "/month",
            produces = "application/json"
    )
    public DashboardMonthResponse month(
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

        return dashboardService.getMonthDashboard(userId, year, month);
    }
}