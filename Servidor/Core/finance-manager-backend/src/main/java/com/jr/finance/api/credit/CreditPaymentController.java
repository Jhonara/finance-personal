package com.jr.finance.api.credit;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.credit.dto.CreateCreditPaymentRequest;
import com.jr.finance.api.credit.dto.CreditPaymentResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/credits")
@RequiredArgsConstructor
@Tag(
        name = "Credits",
        description = "Operaciones para registrar pagos realizados sobre los créditos del usuario."
)
public class CreditPaymentController {

    private final CreditPaymentService paymentService;

    @Operation(
            summary = "Registrar pago de un crédito",
            description = "Registra un pago contractual. Si accountId está presente, registra además una salida CREDIT_PAYMENT. El cliente no define interés ni capital."
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
    public CreditPaymentResponse registerPayment(
            @PathVariable Long id,
            @Valid @RequestBody CreateCreditPaymentRequest req,
            Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        return paymentService.registerPayment(userId, id, req);
    }

    @PostMapping(value = "/{creditId}/payments/{paymentId}/reverse", produces = "application/json")
    @Operation(summary = "Revertir pago de crédito", description = "Marca el pago como REVERSED y, si tuvo cuenta, crea el reversal técnico en el ledger.")
    @ApiResponses({@ApiResponse(responseCode = "200", description = "Pago revertido"), @ApiResponse(responseCode = "404", description = "Crédito o pago inexistente o ajeno"), @ApiResponse(responseCode = "409", description = "Pago ya revertido")})
    public CreditPaymentResponse reverse(@PathVariable Long creditId, @PathVariable Long paymentId, Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        return paymentService.reverse(principal.getUser().getId(), creditId, paymentId);
    }
}
