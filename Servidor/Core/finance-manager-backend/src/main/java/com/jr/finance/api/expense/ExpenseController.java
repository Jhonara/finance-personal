package com.jr.finance.api.expense;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.expense.dto.CreateExpenseRequest;
import com.jr.finance.api.expense.dto.MonthComparisonResponse;
import com.jr.finance.api.expense.dto.MonthlySummaryResponse;
import com.jr.finance.api.expense.dto.PeriodComparisonResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService expenseService;

    @PostMapping
    public Expense create(@RequestBody CreateExpenseRequest req, Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();
        return expenseService.create(userId, req);
    }

    @GetMapping("/month")
    public List<Expense> listByMonth(@RequestParam int year, @RequestParam int month, Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();
        return expenseService.listByMonth(userId, year, month);
    }

    @GetMapping("/summary")
    public MonthlySummaryResponse summary(@RequestParam int year,
                                          @RequestParam int month,
                                          Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();
        return expenseService.monthlySummary(userId, year, month);
    }

    //Comparacion mes actual con el mes anterior

    @GetMapping("/compare")
    public MonthComparisonResponse compare(@RequestParam int year,
                                           @RequestParam int month,
                                           Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();
        return expenseService.compareMonth(userId, year, month);
    }

    //COmparacion de meses distontos
    @GetMapping("/compare-periods")
    public PeriodComparisonResponse comparePeriods(@RequestParam int year1,
                                                   @RequestParam int month1,
                                                   @RequestParam int year2,
                                                   @RequestParam int month2,
                                                   Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();
        return expenseService.comparePeriods(userId, year1, month1, year2, month2);
    }


}
