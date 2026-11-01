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
import com.jr.finance.api.common.exception.ConflictException;
import com.jr.finance.api.saving.dto.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class SavingService {

    private static final BigDecimal MAX_STORED_AMOUNT = new BigDecimal("999999999999999.9999");

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
        goal.setName(req.getName().trim());
        goal.setDescription(req.getDescription());
        goal.setTargetDate(req.getTargetDate());
        goal.setCurrency(req.getCurrency());
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
    public SavingGoal assignCurrency(Long userId, Long goalId, String currency) {
        SavingGoal goal = savingGoalRepository.findById(goalId)
                .filter(item -> item.getUser().getId().equals(userId))
                .orElseThrow(() -> new NotFoundException("La meta de ahorro no existe"));
        if (goal.getCurrency() != null) {
            throw new BadRequestException("La moneda de esta meta ya está definida");
        }
        goal.setCurrency(currency);
        return savingGoalRepository.saveAndFlush(goal);
    }

    @Transactional(readOnly = true)
    public SavingGoal get(Long userId, Long id) { return owned(userId, id); }

    private SavingGoal owned(Long userId, Long id) {
        return savingGoalRepository.findById(id).filter(g -> g.getUser().getId().equals(userId))
                .orElseThrow(() -> new NotFoundException("La meta de ahorro no existe"));
    }

    private void checkVersion(SavingGoal goal, Long version) {
        if (!java.util.Objects.equals(goal.getVersion(), version))
            throw new ConflictException("La meta cambió. Actualiza sus datos antes de continuar.");
    }

    @Transactional
    public SavingGoal update(Long userId, Long id, UpdateSavingGoalRequest req) {
        var goal = owned(userId, id); checkVersion(goal, req.version());
        goal.setName(req.name().trim()); goal.setDescription(req.description()); goal.setTargetDate(req.targetDate());
        goal.setTargetAmount(req.targetAmount());
        goal.setCompleted(goal.getCurrentAmount().compareTo(goal.getTargetAmount()) >= 0);
        return savingGoalRepository.saveAndFlush(goal);
    }

    @Transactional
    public SavingGoal changeStatus(Long userId, Long id, ChangeSavingStatusRequest req) {
        var goal = owned(userId, id); checkVersion(goal, req.version());
        goal.setStatus(req.status());
        return savingGoalRepository.saveAndFlush(goal);
    }

    @Transactional
    public void deleteEmpty(Long userId, Long id, Long version) {
        var goal = owned(userId, id); checkVersion(goal, version);
        if (goal.getCurrentAmount().signum() != 0 || savingMovementRepository.existsBySavingGoalId(id))
            throw new ConflictException("Esta meta tiene historial. Ciérrala o cancélala para conservar sus movimientos.");
        savingGoalRepository.delete(goal); savingGoalRepository.flush();
    }

    @Transactional(readOnly = true)
    public List<SavingMovementResponse> movements(Long userId, Long id) {
        owned(userId, id);
        return savingMovementRepository.findBySavingGoalIdOrderByMovementDateDescIdDesc(id).stream()
                .map(m -> new SavingMovementResponse(m.getId(), m.getType(), m.getAmount(), m.getMovementDate(), m.getDescription())).toList();
    }

    @Transactional
    public SavingGoal addMovement(Long userId, Long id, AddSavingMovementRequest req) {
        return movement(userId, id, req, SavingMovementType.CONTRIBUTION);
    }

    @Transactional
    public SavingGoal withdraw(Long userId, Long id, AddSavingMovementRequest req) {
        if (req.getVersion() == null) throw new BadRequestException("Actualiza la meta antes de retirar");
        return movement(userId, id, req, SavingMovementType.WITHDRAWAL);
    }

    private SavingGoal movement(Long userId, Long id, AddSavingMovementRequest req, SavingMovementType type) {
        var goal = owned(userId, id);
        if (req.getAmount() == null || req.getAmount().signum() <= 0) throw new BadRequestException("La cantidad debe ser mayor que 0");
        if (req.getRequestId() != null) {
            var previous = savingMovementRepository.findBySavingGoalIdAndRequestId(id, req.getRequestId());
            if (previous.isPresent()) {
                var m = previous.get();
                if (m.getType() != type || m.getAmount().compareTo(req.getAmount()) != 0 || !m.getMovementDate().equals(req.getMovementDate())
                        || !java.util.Objects.equals(m.getDescription(), req.getDescription()))
                    throw new ConflictException("Este identificador ya se usó para otro movimiento");
                return goal;
            }
        }
        if (req.getVersion() != null) checkVersion(goal, req.getVersion());
        if (type == SavingMovementType.CONTRIBUTION && (goal.getStatus() != SavingGoalStatus.ACTIVE || goal.isCompleted()))
            throw new BadRequestException("Solo puedes aportar a una meta activa que no esté cumplida");
        BigDecimal next = type == SavingMovementType.CONTRIBUTION ? goal.getCurrentAmount().add(req.getAmount())
                : goal.getCurrentAmount().subtract(req.getAmount());
        if (next.signum() < 0) throw new BadRequestException("El retiro supera lo ahorrado en esta meta");
        if (next.compareTo(MAX_STORED_AMOUNT) > 0) throw new BadRequestException("El total ahorrado supera el importe máximo permitido");
        goal.setCurrentAmount(next); goal.setCompleted(next.compareTo(goal.getTargetAmount()) >= 0);
        // Preserve existing informational semantics: neither operation creates bank/ledger movements.
        var saved = savingGoalRepository.saveAndFlush(goal);
        var movement = new SavingMovement(); movement.setSavingGoal(saved); movement.setType(type);
        movement.setAmount(req.getAmount()); movement.setMovementDate(req.getMovementDate());
        movement.setRequestId(req.getRequestId()); movement.setDescription(req.getDescription());
        savingMovementRepository.saveAndFlush(movement);
        return saved;
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
