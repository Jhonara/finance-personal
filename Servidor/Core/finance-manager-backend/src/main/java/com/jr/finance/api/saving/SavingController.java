package com.jr.finance.api.saving;

import com.jr.finance.api.auth.UserPrincipal;
import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.saving.dto.AddSavingMovementRequest;
import com.jr.finance.api.saving.dto.CreateSavingGoalRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/savings")
@RequiredArgsConstructor
public class SavingController {

    private final SavingService savingService;

    @PostMapping("/goals")
    public SavingGoal createGoal(@Valid @RequestBody CreateSavingGoalRequest req, Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();
        return savingService.createGoal(userId, req);
    }

    @GetMapping("/goals")
    public List<SavingGoal> listGoals(Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();
        return savingService.listGoals(userId);
    }

    @PostMapping("/goals/{id}/movements")
    public SavingGoal addMovement(@PathVariable Long id,
                                  @Valid @RequestBody AddSavingMovementRequest req,
                                  Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();
        return savingService.addMovement(userId, id, req);
    }

    @GetMapping("/goals/{id}/progress")
    public BigDecimal progress(@PathVariable Long id, Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        Long userId = principal.getUser().getId();

        SavingGoal goal = savingService.listGoals(userId).stream()
                .filter(g -> g.getId().equals(id))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Saving goal not found"));

        return savingService.progressPercentage(goal);
    }
}
