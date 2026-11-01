package com.jr.finance.api;

import com.jr.finance.api.budget.dto.CreateBudgetRequest;
import com.jr.finance.api.budget.dto.UpdateBudgetRequest;
import com.jr.finance.api.saving.dto.AddSavingMovementRequest;
import com.jr.finance.api.saving.dto.CreateSavingGoalRequest;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class PlanningInputValidationTest {
    private static final ValidatorFactory FACTORY = Validation.buildDefaultValidatorFactory();
    private static final Validator VALIDATOR = FACTORY.getValidator();

    @AfterAll static void closeValidator() { FACTORY.close(); }

    @Test void budgetCreationRejectsAmountsOutsideTheStoredPrecision() {
        var request = budget("1000000000000000");
        assertThat(VALIDATOR.validateProperty(request, "limitAmount")).isNotEmpty();
        request.setLimitAmount(new BigDecimal("100.12345"));
        assertThat(VALIDATOR.validateProperty(request, "limitAmount")).isNotEmpty();
    }

    @Test void budgetUpdatesRejectAmountsOutsideTheStoredPrecision() {
        var request = new UpdateBudgetRequest();
        request.setVersion(0L);
        request.setLimitAmount(new BigDecimal("1000000000000000"));
        assertThat(VALIDATOR.validateProperty(request, "limitAmount")).isNotEmpty();
        request.setLimitAmount(new BigDecimal("100.12345"));
        assertThat(VALIDATOR.validateProperty(request, "limitAmount")).isNotEmpty();
    }

    @Test void savingsTargetsRejectOverflowAndMoreThanFourDecimals() {
        var request = goal("1000000000000000");
        assertThat(VALIDATOR.validateProperty(request, "targetAmount")).isNotEmpty();
        request.setTargetAmount(new BigDecimal("100.12345"));
        assertThat(VALIDATOR.validateProperty(request, "targetAmount")).isNotEmpty();
    }

    @Test void savingsGoalNamesMatchTheStoredLength() {
        var request = goal("100");
        request.setName("x".repeat(101));
        assertThat(VALIDATOR.validateProperty(request, "name")).isNotEmpty();
        request.setName("x".repeat(100));
        assertThat(VALIDATOR.validate(request)).isEmpty();
    }

    @Test void savingsContributionsRejectOverflowAndMoreThanFourDecimals() {
        var request = new AddSavingMovementRequest();
        request.setMovementDate(LocalDate.of(2026, 10, 31));
        request.setAmount(new BigDecimal("1000000000000000"));
        assertThat(VALIDATOR.validateProperty(request, "amount")).isNotEmpty();
        request.setAmount(new BigDecimal("100.12345"));
        assertThat(VALIDATOR.validateProperty(request, "amount")).isNotEmpty();
    }

    @Test void existingFourDecimalAmountsAndMaximumSupportedValueRemainValid() {
        assertThat(VALIDATOR.validate(budget("999999999999999.9999"))).isEmpty();
        assertThat(VALIDATOR.validate(goal("999999999999999.9999"))).isEmpty();
        var movement = new AddSavingMovementRequest();
        movement.setMovementDate(LocalDate.of(2026, 10, 31));
        movement.setAmount(new BigDecimal("0.0001"));
        assertThat(VALIDATOR.validate(movement)).isEmpty();
    }

    private CreateBudgetRequest budget(String amount) {
        var request = new CreateBudgetRequest();
        request.setCategoryId(1L); request.setYear(2026); request.setMonth(10);
        request.setLimitAmount(new BigDecimal(amount));
        return request;
    }

    private CreateSavingGoalRequest goal(String amount) {
        var request = new CreateSavingGoalRequest();
        request.setName("Meta de prueba"); request.setCurrency("COP");
        request.setTargetAmount(new BigDecimal(amount));
        return request;
    }
}
