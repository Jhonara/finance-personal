package com.jr.finance.api.credit;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.credit.dto.CreditPlanVsRealResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/credits")
@RequiredArgsConstructor
@Tag(
        name = "Análisis de Créditos",
        description = "Operaciones para comparar el plan de pagos original de un crédito con los pagos realmente realizados."
)
public class CreditPlanVsRealController {

    private final CreditPlanVsRealService service;

    @Operation(
            summary = "Comparar plan de pagos vs pagos reales",
            description = "Compara el cronograma de amortización original del crédito con los pagos registrados por el usuario y determina el estado actual del crédito."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Comparación realizada correctamente"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado"),
            @ApiResponse(responseCode = "404", description = "Crédito no encontrado")
    })
    @GetMapping(
            value = "/{id}/plan-vs-real",
            produces = "application/json"
    )
    public CreditPlanVsRealResponse planVsReal(@PathVariable Long id, Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        return service.calculate(userId, id);
    }
}