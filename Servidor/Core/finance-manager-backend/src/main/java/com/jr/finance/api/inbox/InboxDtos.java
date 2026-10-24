package com.jr.finance.api.inbox;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;

public final class InboxDtos {
    private InboxDtos() {}
    public enum Kind { EXPENSE, OTHER }
    @Schema(name = "PurchaseDraftFields")
    public record Fields(@NotNull Kind kind, @NotBlank @Size(max = 120) String description,
            @Positive @Digits(integer = 15, fraction = 4) BigDecimal amount,
            @Pattern(regexp = "[A-Z]{3}") String currency, LocalDate effectiveDate,
            @Positive Long accountId, @Positive Long categoryId) {}
    @Schema(name = "CreatePurchaseDraft")
    public record Create(@NotBlank @Pattern(regexp = "[a-zA-Z0-9-]{16,80}") String requestKey,
            @NotNull @Valid Fields fields) {}
    @Schema(name = "UpdatePurchaseDraft")
    public record Update(@NotNull @PositiveOrZero Long version, @NotNull @Valid Fields fields) {}
    @Schema(name = "ConfirmPurchaseDraft")
    public record Confirm(@NotNull @PositiveOrZero Long version, @NotBlank String reviewToken,
            boolean distinctPurchase) {}
    @Schema(name = "LinkPurchaseDraft")
    public record Link(@NotNull @PositiveOrZero Long version, @NotNull @Positive Long transactionId) {}
    @Schema(name = "PurchaseMatch")
    public record Match(Long id, String kind, String description, LocalDate date, BigDecimal amount,
            String currency, String accountName, String transactionType) {}
    @Schema(name = "PurchaseCategorySuggestion")
    public record Suggestion(Long id, String name) {}
    @Schema(name = "PurchaseDraftResponse")
    public record Draft(Long id, long version, String status, String source, Fields fields,
            Instant createdAt, Long transactionId, List<Match> matches, String reviewToken,
            Suggestion categorySuggestion) {}
    @Schema(name = "PurchaseDraftPage")
    public record DraftPage(List<Draft> content, long totalElements, boolean hasNext) {}
}
