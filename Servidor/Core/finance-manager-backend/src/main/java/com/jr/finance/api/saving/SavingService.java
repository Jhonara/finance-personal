package com.jr.finance.api.saving;

import com.jr.finance.api.common.exception.BadRequestException;
import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.saving.dto.AddSavingMovementRequest;
import com.jr.finance.api.saving.dto.CreateSavingGoalRequest;
import com.jr.finance.api.user.User;
import com.jr.finance.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SavingService {

    private final SavingGoalRepository savingGoalRepository;
    private final SavingMovementRepository savingMovementRepository;
    private final UserRepository userRepository;

    public SavingGoal createGoal(Long userId, CreateSavingGoalRequest req) {

        log.info("Creando meta de ahorro para el usuario {}.", userId);

        if (req.getTargetAmount().compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("El usuario {} intentó crear una meta con un monto objetivo inválido.", userId);
            throw new BadRequestException("El monto objetivo debe ser mayor que 0");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.warn("Usuario con id {} no encontrado.", userId);
                    return new NotFoundException("Usuario no encontrado");
                });

        SavingGoal goal = new SavingGoal();
        goal.setUser(user);
        goal.setName(req.getName());
        goal.setTargetAmount(req.getTargetAmount());
        goal.setCurrentAmount(BigDecimal.ZERO);
        goal.setCompleted(false);

        SavingGoal savedGoal = savingGoalRepository.save(goal);

        log.info("Meta de ahorro {} creada correctamente para el usuario {}.",
                savedGoal.getId(),
                userId);

        return savedGoal;
    }

    public List<SavingGoal> listGoals(Long userId) {

        log.info("Consultando metas de ahorro del usuario {}.", userId);

        return savingGoalRepository.findByUserId(userId);
    }

    @Transactional
    public SavingGoal addMovement(Long userId, Long goalId, AddSavingMovementRequest req) {

        log.info("Registrando movimiento para la meta {} del usuario {}.",
                goalId,
                userId);

        if (req.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("El usuario {} intentó registrar un movimiento con un monto inválido.", userId);
            throw new BadRequestException("La cantidad debe ser mayor que 0");
        }

        SavingGoal goal = savingGoalRepository.findById(goalId)
                .orElseThrow(() -> {
                    log.warn("Meta de ahorro {} no encontrada.", goalId);
                    return new NotFoundException("La meta de ahorro no existe");
                });

        if (!goal.getUser().getId().equals(userId)) {
            log.warn("El usuario {} intentó acceder a la meta {} sin permisos.",
                    userId,
                    goalId);
            throw new NotFoundException("La meta de ahorro no existe");
        }

        if (goal.isCompleted()) {
            log.warn("El usuario {} intentó agregar dinero a una meta ya completada. Meta {}.",
                    userId,
                    goalId);
            throw new BadRequestException("Esta meta de ahorro ya está cumplida");
        }

        BigDecimal newAmount = goal.getCurrentAmount().add(req.getAmount());

        goal.setCurrentAmount(newAmount);

        if (newAmount.compareTo(goal.getTargetAmount()) >= 0) {
            goal.setCompleted(true);

            log.info("La meta de ahorro {} fue completada por el usuario {}.",
                    goalId,
                    userId);
        }

        // Flush the versioned aggregate first. A concurrent writer fails before
        // creating a movement that could not be reflected in currentAmount.
        SavingGoal savedGoal = savingGoalRepository.saveAndFlush(goal);

        SavingMovement movement = new SavingMovement();
        movement.setSavingGoal(savedGoal);
        movement.setAmount(req.getAmount());
        movement.setMovementDate(req.getMovementDate());
        savingMovementRepository.saveAndFlush(movement);

        log.info("Movimiento registrado correctamente en la meta {}.",
                savedGoal.getId());

        return savedGoal;
    }

    public BigDecimal progressPercentage(SavingGoal goal) {

        if (goal.getTargetAmount().compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }

        return goal.getCurrentAmount()
                .divide(goal.getTargetAmount(), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
    }
}
