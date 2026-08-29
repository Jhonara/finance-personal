package com.jr.finance.api.common;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.common.dto.MonthlyBalanceResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@Tag(
        name = "Balance",
        description = "Consulta el balance financiero mensual del usuario."
)
@RestController
@RequestMapping("/api/v1/balance")
@RequiredArgsConstructor
public class BalanceController {

    private final BalanceService balanceService;

    @Operation(
            summary = "Obtener balance mensual",
            description = "Calcula el balance del usuario para un año y mes determinados."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Balance obtenido correctamente"),
            @ApiResponse(responseCode = "400", description = "Parámetros inválidos"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado")
    })
    @GetMapping("/month")
    public MonthlyBalanceResponse monthly(@RequestParam int year,
                                          @RequestParam int month,
                                          Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();
        return balanceService.monthlyBalance(userId, year, month);
    }
}
