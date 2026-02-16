package com.jr.finance.api.income;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.income.dto.CreateIncomeRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/incomes")
@RequiredArgsConstructor
public class IncomeController {

    private final IncomeService incomeService;

    @PostMapping
    public Income create(@Valid @RequestBody CreateIncomeRequest req, Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();
        return incomeService.create(userId, req);
    }

    @GetMapping("/month")
    public List<Income> listByMonth(@RequestParam int year, @RequestParam int month, Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();
        return incomeService.listByMonth(userId, year, month);
    }
}
