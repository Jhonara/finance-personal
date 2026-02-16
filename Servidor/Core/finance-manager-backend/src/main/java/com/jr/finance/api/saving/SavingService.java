package com.jr.finance.api.saving;

import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.saving.dto.AddSavingMovementRequest;
import com.jr.finance.api.saving.dto.CreateSavingGoalRequest;
import com.jr.finance.api.user.User;
import com.jr.finance.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SavingService {

    private final SavingGoalRepository savingGoalRepository;
    private final SavingMovementRepository savingMovementRepository;
    private final UserRepository userRepository;

    public SavingGoal createGoal(Long userId, CreateSavingGoalRequest req) {
        if (req.getTargetAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("El aporte al objetivo debe ser mayor que 0");//Target amount must be greater than 0
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User no encontrado"));

        SavingGoal goal = new SavingGoal();
        goal.setUser(user);
        goal.setName(req.getName());
        goal.setTargetAmount(req.getTargetAmount());
        goal.setCurrentAmount(BigDecimal.ZERO);
        goal.setCompleted(false);

        return savingGoalRepository.save(goal);
    }

    public List<SavingGoal> listGoals(Long userId) {
        return savingGoalRepository.findByUserId(userId);
    }

    public SavingGoal addMovement(Long userId, Long goalId, AddSavingMovementRequest req) {
        if (req.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("La cantidad debe ser mayor que 0");//Amount must be greater than 0
        }

        SavingGoal goal = savingGoalRepository.findById(goalId)
                .orElseThrow(() -> new NotFoundException("La meta de ahorro no existe"));

        if (!goal.getUser().getId().equals(userId)) {
            throw new NotFoundException("La meta de ahorro no existe");
        }

        if (goal.isCompleted()) {
            throw new RuntimeException("Esta meta de ahorro ya está cumplida");//"This saving goal is already completed
        }

        var newAmount = goal.getCurrentAmount().add(req.getAmount());

        SavingMovement movement = new SavingMovement();
        movement.setSavingGoal(goal);
        movement.setAmount(req.getAmount());
        movement.setMovementDate(req.getMovementDate());
        savingMovementRepository.save(movement);

        goal.setCurrentAmount(newAmount);

        if (newAmount.compareTo(goal.getTargetAmount()) >= 0) {
            goal.setCompleted(true);
        }

        return savingGoalRepository.save(goal);
    }

    public BigDecimal progressPercentage(SavingGoal goal) {
        if (goal.getTargetAmount().compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;

        return goal.getCurrentAmount()
                .divide(goal.getTargetAmount(), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
    }
}
