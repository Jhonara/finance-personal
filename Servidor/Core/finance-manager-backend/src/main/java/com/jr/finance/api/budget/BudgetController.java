package com.jr.finance.api.budget;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.budget.dto.BudgetResponse;
import com.jr.finance.api.budget.dto.CreateBudgetRequest;
import com.jr.finance.api.budget.dto.UpdateBudgetRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/budgets")
@RequiredArgsConstructor
public class BudgetController {

    private final BudgetService budgetService;

    @PostMapping
    public ResponseEntity<BudgetResponse> create(@Valid @RequestBody CreateBudgetRequest request,
                                                 Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(budgetService.create(userId(authentication), request));
    }

    @GetMapping
    public List<BudgetResponse> list(@RequestParam(required = false) Integer year,
                                     @RequestParam(required = false) Integer month,
                                     Authentication authentication) {
        return budgetService.list(userId(authentication), year, month);
    }

    @GetMapping("/{id}")
    public BudgetResponse get(@PathVariable Long id, Authentication authentication) {
        return budgetService.get(userId(authentication), id);
    }

    @PatchMapping("/{id}")
    public BudgetResponse update(@PathVariable Long id, @Valid @RequestBody UpdateBudgetRequest request,
                                 Authentication authentication) {
        return budgetService.update(userId(authentication), id, request);
    }

    private Long userId(Authentication authentication) {
        return ((UserPrincipal) authentication.getPrincipal()).getUser().getId();
    }
}
