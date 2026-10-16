package com.jr.finance.api.saving;

import com.jr.finance.api.common.exception.BadRequestException;
import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.user.User;
import com.jr.finance.api.user.UserRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class SavingCurrencyTest {
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
