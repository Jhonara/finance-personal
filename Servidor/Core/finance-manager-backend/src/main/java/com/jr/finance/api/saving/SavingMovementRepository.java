package com.jr.finance.api.saving;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SavingMovementRepository extends JpaRepository<SavingMovement, Long> {
    List<SavingMovement> findBySavingGoalId(Long savingGoalId);
}
