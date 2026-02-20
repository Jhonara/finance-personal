package com.jr.finance.api.credit;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.credit.dto.CreditPlanVsRealResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/credits")
@RequiredArgsConstructor
public class CreditPlanVsRealController {

    private final CreditPlanVsRealService service;

    @GetMapping("/{id}/plan-vs-real")
    public CreditPlanVsRealResponse planVsReal(@PathVariable Long id, Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        return service.calculate(userId, id);
    }
}
