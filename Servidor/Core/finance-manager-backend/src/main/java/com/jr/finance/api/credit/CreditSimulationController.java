package com.jr.finance.api.credit;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.credit.dto.CreditSimulationRequest;
import com.jr.finance.api.credit.dto.CreditSimulationResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/credits")
@RequiredArgsConstructor
public class CreditSimulationController {

    private final CreditSimulationService creditSimulationService;
    private final CreditService creditService;
    private final CreditScenarioCompareService creditScenarioCompareService;

    // Simulador libre
    @PostMapping("/simulate/free")
    public CreditSimulationResponse simulateFree(@Valid @RequestBody CreditSimulationRequest req) {
        return creditSimulationService.simulateInternal(req);
    }


    // Simular un crédito existente (rellena datos desde BD)
    @PostMapping("/{id}/simulate")
    public CreditSimulationResponse simulateExisting(@PathVariable Long id,
                                                     @RequestBody(required = false) CreditSimulationRequest overrides,
                                                     Authentication auth) {

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();
        var credit = creditService.findByIdForUser(userId, id);

        CreditSimulationRequest req = new CreditSimulationRequest();
        req.setPrincipal(credit.getPrincipal());
        req.setAnnualRate(credit.getAnnualRate());
        req.setTermMonths(credit.getTermMonths());
        req.setDisbursementDate(credit.getDisbursementDate());
        req.setPaymentDay(credit.getPaymentDay());

        if (overrides != null) {
            req.setExtraPayments(overrides.getExtraPayments());
            req.setToday(overrides.getToday());
            req.setCurrentInstallment(overrides.getCurrentInstallment());
        }

        return creditSimulationService.simulateInternal(req);
    }

    //Comparador de escenarios de abonos
    @PostMapping("/simulate/compare")
    public java.util.List<com.jr.finance.api.credit.dto.CreditScenarioCompareResponse> compare(
            @Valid @RequestBody com.jr.finance.api.credit.dto.CreditScenarioCompareRequest req) {
        return creditScenarioCompareService.compareScenarios(req);
    }
}
