package com.jr.finance.api.saving.dto;
import com.jr.finance.api.saving.SavingMovementType;
import java.math.BigDecimal;
import java.time.LocalDate;
public record SavingMovementResponse(Long id, SavingMovementType type, BigDecimal amount, LocalDate movementDate, String description) { }
