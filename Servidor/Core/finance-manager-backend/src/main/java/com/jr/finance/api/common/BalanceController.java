package com.jr.finance.api.common;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.common.dto.MonthlyBalanceResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/balance")
@RequiredArgsConstructor
public class BalanceController {

    private final BalanceService balanceService;

    @GetMapping("/month")
    public MonthlyBalanceResponse monthly(@RequestParam int year,
                                          @RequestParam int month,
                                          Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();
        return balanceService.monthlyBalance(userId, year, month);
    }
}
