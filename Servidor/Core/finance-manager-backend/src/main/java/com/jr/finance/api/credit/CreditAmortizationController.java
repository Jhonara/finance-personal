package com.jr.finance.api.credit;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.credit.dto.CreditAmortizationResponse;
import com.jr.finance.api.credit.dto.CreditAmortizationScenarioRequest;
import com.jr.finance.api.credit.dto.CreditAmortizationScenarioResponse;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/credits/{id}/amortization")
@RequiredArgsConstructor
public class CreditAmortizationController {
    private final CreditAmortizationOverviewService amortization;

    @GetMapping
    @Operation(summary = "Consultar la amortización de un crédito propio",
            description = "Devuelve pagos contabilizados, plan original y proyección desde el saldo real. No modifica datos.")
    public CreditAmortizationResponse overview(@PathVariable Long id, Authentication auth) {
        Long userId = ((UserPrincipal) auth.getPrincipal()).getUser().getId();
        return amortization.overview(userId, id);
    }

    @PostMapping("/scenarios")
    @Operation(summary = "Probar un abono extraordinario sin registrarlo",
            description = "Compara el plazo e interés restantes con y sin un abono futuro a capital. No modifica datos.")
    public CreditAmortizationScenarioResponse scenario(@PathVariable Long id,
            @Valid @RequestBody CreditAmortizationScenarioRequest request, Authentication auth) {
        Long userId = ((UserPrincipal) auth.getPrincipal()).getUser().getId();
        return amortization.scenario(userId, id, request);
    }
}
