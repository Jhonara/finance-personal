package com.jr.finance.api.credit;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.credit.dto.CreateCreditPaymentRequest;
import com.jr.finance.api.credit.dto.CreditStatusResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/credits")
@RequiredArgsConstructor
@Tag(
        name = "Pagos de Créditos",
        description = "Operaciones para registrar pagos realizados sobre los créditos del usuario."
)
public class CreditPaymentController {

    private final CreditPaymentService paymentService;

    @Operation(
            summary = "Registrar pago de un crédito",
            description = "Registra un pago normal y, opcionalmente, un abono extraordinario sobre un crédito del usuario autenticado."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Pago registrado correctamente"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos"),
            @ApiResponse(responseCode = "401", description = "Usuario no autenticado"),
            @ApiResponse(responseCode = "404", description = "Crédito no encontrado")
    })
    @PostMapping(
            value = "/{id}/payments",
            consumes = "application/json",
            produces = "application/json"
    )
    public CreditStatusResponse registerPayment(
            @PathVariable Long id,
            @Valid @RequestBody CreateCreditPaymentRequest req,
            Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        return paymentService.registerPayment(userId, id, req);
    }
}