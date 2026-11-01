package com.jr.finance.api.saving;

import com.jr.finance.api.common.exception.BadRequestException;
import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.user.User;
import com.jr.finance.api.user.UserRepository;
import com.jr.finance.api.saving.dto.AddSavingMovementRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class SavingCurrencyTest {
    @Test
    void rejectsATotalThatWouldOverflowWithoutChangingTheGoalOrSavingAMovement() {
        var goals = mock(SavingGoalRepository.class);
        var movements = mock(SavingMovementRepository.class);
        var owner = new User(); owner.setId(7L);
        var goal = new SavingGoal(); goal.setUser(owner);
        goal.setCurrentAmount(new BigDecimal("4")); goal.setTargetAmount(new BigDecimal("100"));
        when(goals.findById(3L)).thenReturn(Optional.of(goal));
        var service = new SavingService(goals, movements, mock(UserRepository.class));
        var request = new AddSavingMovementRequest();
        request.setAmount(new BigDecimal("999999999999999.9999"));
        request.setMovementDate(LocalDate.of(2026, 10, 31));

        assertThatThrownBy(() -> service.addMovement(7L, 3L, request))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("máximo");
        assertThat(goal.getCurrentAmount()).isEqualByComparingTo("4");
        assertThat(goal.isCompleted()).isFalse();
        verify(goals, never()).saveAndFlush(any());
        verifyNoInteractions(movements);
    }
    @Test
    void assignsTheCurrencyOfAnOwnedLegacyGoalOnlyOnce() {
        var goals = mock(SavingGoalRepository.class);
        var goal = new SavingGoal();
        var user = new User();
        user.setId(7L);
        goal.setUser(user);
        when(goals.findById(3L)).thenReturn(Optional.of(goal));
        when(goals.saveAndFlush(goal)).thenReturn(goal);
        var service = new SavingService(goals, mock(SavingMovementRepository.class), mock(UserRepository.class));

        assertThat(service.assignCurrency(7L, 3L, "USD").getCurrency()).isEqualTo("USD");
        assertThatThrownBy(() -> service.assignCurrency(7L, 3L, "COP"))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.assignCurrency(8L, 3L, "USD"))
                .isInstanceOf(NotFoundException.class);
        verify(goals, times(1)).saveAndFlush(goal);
    }
}
