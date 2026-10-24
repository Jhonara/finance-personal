package com.jr.finance.api.alerts.dto;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
public record UpdateAlertRequest(@NotNull @PositiveOrZero Long revision, @NotNull Action action) {
    public enum Action { READ, SNOOZE, RESUME }
}
