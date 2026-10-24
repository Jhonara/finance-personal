package com.jr.finance.api.recurrence;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class RecurrenceDtos {
    private RecurrenceDtos() {}
    public enum AmountBasis { PER_PAYMENT, MONTHLY_TOTAL }
    @Schema(name = "RecurringPreviewRequest")
    public record PreviewRequest(@NotNull RecurrenceFrequency frequency, @NotNull AmountBasis amountBasis,
            @NotNull @Positive @Digits(integer = 15, fraction = 4) BigDecimal amount,
            @NotNull LocalDate startDate, LocalDate endDate,
            @Min(1) @Max(31) int firstDay, @Min(1) @Max(31) Integer secondDay) {}
    @Schema(name = "RecurringPreviewMonth")
    public record PreviewMonth(LocalDate month, List<LocalDate> dates, BigDecimal total) {}
    @Schema(name = "RecurringPreviewResponse")
    public record Preview(BigDecimal amountPerPayment, BigDecimal fullMonthTotal, List<PreviewMonth> months) {}
    @Schema(name = "SaveRecurringRuleRequest")
    public record SaveRule(
            @NotBlank @Size(max = 100) String name,
            @NotNull RecurrenceKind kind, @NotNull RecurrenceFrequency frequency,
            @NotNull RecurrenceMode mode,
            @NotNull @Positive @Digits(integer = 15, fraction = 4) BigDecimal amount,
            @NotNull Long accountId, Long categoryId,
            @NotBlank @Size(max = 64) String timeZone,
            @NotNull LocalDate startDate, LocalDate endDate,
            @Min(1) @Max(31) int firstDay, @Min(1) @Max(31) Integer secondDay,
            @NotBlank @Pattern(regexp = "[a-zA-Z0-9-]{16,36}") String requestKey,
            Long version) {}
    @Schema(name = "RecurringRuleResponse")
    public record Rule(Long id, String name, RecurrenceKind kind, RecurrenceFrequency frequency,
                       RecurrenceMode mode, BigDecimal amount, Long accountId, String accountName,
                       Long categoryId, String currency, String timeZone, LocalDate startDate,
                       LocalDate endDate, int firstDay, Integer secondDay, LocalDate nextDate,
                       boolean active, Long version, String requestKey, String state) {}
    @Schema(name = "RecurringEntryResponse", description = "PLANNED and PENDING never affect balances or reports.")
    public record Entry(Long id, Long ruleId, String name, RecurrenceKind kind, RecurrenceMode mode,
                        LocalDate dueDate, BigDecimal amount, String currency, Long accountId,
                        String accountName, String status, String issue, Long transactionId,
                        LocalDate recordedDate) {}
    @Schema(name = "RecurringAgendaResponse")
    public record Agenda(List<Entry> entries) {}
    @Schema(name = "RecurringUpcomingResponse")
    public record Upcoming(LocalDate from, LocalDate to, List<Entry> entries, int total) {}
    @Schema(name = "SetRecurringActiveRequest")
    public record SetActive(@NotNull Boolean active, @NotNull Long version) {}
    @Schema(name = "ConfirmRecurringEntryRequest")
    public record Confirm(@NotNull @Positive @Digits(integer = 15, fraction = 4) BigDecimal amount,
                          @NotNull LocalDate date) {}
}
