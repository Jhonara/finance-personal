package com.jr.finance.api.saving.mapper;

import com.jr.finance.api.saving.SavingGoal;
import com.jr.finance.api.saving.SavingService;
import com.jr.finance.api.saving.dto.SavingGoalResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class SavingGoalMapper {

    private final SavingService savingService;

    public SavingGoalResponse toResponse(SavingGoal goal) {

        SavingGoalResponse response = new SavingGoalResponse();

        response.setId(goal.getId());
        response.setName(goal.getName());
        response.setTargetAmount(goal.getTargetAmount());
        response.setCurrentAmount(goal.getCurrentAmount());
        response.setCompleted(goal.isCompleted());
        response.setProgress(savingService.progressPercentage(goal));

        return response;
    }

    public List<SavingGoalResponse> toResponseList(List<SavingGoal> goals) {
        return goals.stream()
                .map(this::toResponse)
                .toList();
    }
}