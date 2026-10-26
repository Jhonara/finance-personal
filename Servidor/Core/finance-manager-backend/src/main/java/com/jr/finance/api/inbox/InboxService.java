package com.jr.finance.api.inbox;

import com.jr.finance.api.account.AccountRepository;
import com.jr.finance.api.common.exception.*;
import com.jr.finance.api.expense.*;
import com.jr.finance.api.ledger.*;
import com.jr.finance.api.recurrence.*;
import com.jr.finance.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import static com.jr.finance.api.inbox.InboxDtos.*;

@Service @RequiredArgsConstructor
public class InboxService {
    private final PurchaseDraftRepository drafts;
    private final InboxMatchRepository matching;
    private final UserRepository users;
    private final AccountRepository accounts;
    private final CategoryRepository categories;
    private final RecurringOccurrenceRepository occurrences;
    private final LedgerService ledger;
    private final Clock recurrenceClock;
    private final WalletCardRepository walletCards;

    @Transactional(readOnly = true)
    public DraftPage list(Long userId, int page) {
        if (page < 0 || page > 10000) throw new BadRequestException("La página no es válida");
        var result = drafts.findByUserIdAndStatusOrderByIdDesc(userId, "PENDING", PageRequest.of(page, 25));
        return new DraftPage(result.map(row -> response(row, false)).getContent(), result.getTotalElements(), result.hasNext());
    }
    @Transactional(readOnly = true)
    public Draft get(Long userId, Long id) { return response(owned(userId, id), true); }

    @Transactional
    public Draft create(Long userId, Create request) {
        if (request.effectiveSource() == Source.APP_INTENT || request.effectiveSource() == Source.WALLET)
            throw new BadRequestException("Usa la entrada nativa para esta compra");
        lock(userId);
        var fingerprint = digest(request.fields().toString() +
                (request.effectiveSource() == Source.PASTED_TEXT ? "" : ":SHORTCUT"));
        var previous = drafts.findByUserIdAndRequestKey(userId, request.requestKey());
        if (previous.isPresent()) {
            if (!previous.get().getInitialFingerprint().equals(fingerprint))
                throw new ConflictException("Este intento ya guardó otro borrador. Abre Por revisar.");
            return response(previous.get(), true);
        }
        var row = new PurchaseDraft(); row.setUserId(userId); row.setRequestKey(request.requestKey());
        row.setSource(request.effectiveSource().name());
        row.setInitialFingerprint(fingerprint); row.setCreatedAt(recurrenceClock.instant());
        apply(row, request.fields());
        return response(drafts.saveAndFlush(row), true);
    }
    @Transactional
    public Draft nativeIntake(Long userId, NativeIntake request) {
        if (!Objects.equals(userId, request.ownerId()))
            throw new ConflictException("Esta acción pertenece a otra sesión. Entra con el usuario que la creó.");
        lock(userId);
        boolean wallet = "importWallet".equals(request.action());
        var reference = WalletCardService.safeReference(request.cardReference());
        if (!wallet && (reference != null || request.eventReference() != null))
            throw new BadRequestException("Estos datos solo corresponden a una compra de Wallet");
        if (request.merchant() != null && request.merchant().chars().anyMatch(Character::isISOControl))
            throw new BadRequestException("El comercio debe ser un texto sin saltos de línea");
        // A stable upstream event ID deduplicates separate deliveries. Without one, only the
        // invocation ID is reliable; similar purchases are reviewed by the existing match service.
        var event = request.eventReference();
        if (event != null && (event.isBlank() || event.chars().anyMatch(Character::isISOControl)))
            throw new BadRequestException("La referencia de la compra no es válida");
        var key = "native-" + digest(request.action() + ":" + (event == null ? request.invocationId() : event));
        var normalizedAmount = request.amount() == null ? null : request.amount().stripTrailingZeros().toPlainString();
        var fingerprint = digest(Arrays.asList(request.action(), request.merchant(), normalizedAmount,
                request.currency(), request.effectiveDate(), request.occurredAt(), reference).toString());
        var previous = drafts.findByUserIdAndRequestKey(userId, key);
        if (previous.isPresent()) {
            if (!fingerprint.equals(previous.get().getNativeFingerprint()))
                throw new ConflictException("La referencia ya se recibió con otros datos. Revisa la compra guardada.");
            return response(previous.get(), true);
        }
        var card = reference == null ? null : walletCards.findByUserIdAndReference(userId, reference).orElse(null);
        var row = new PurchaseDraft(); row.setUserId(userId); row.setRequestKey(key);
        row.setNativeFingerprint(fingerprint); row.setInitialFingerprint(fingerprint);
        row.setSource(wallet ? "WALLET" : "APP_INTENT"); row.setCardReference(reference);
        row.setCardKind(wallet ? (card == null ? "UNKNOWN" : card.getKind()) : null);
        row.setOccurredAt(request.occurredAt()); row.setCreatedAt(recurrenceClock.instant());
        Long suggestedAccount = null;
        if (card != null && "DEBIT".equals(card.getKind())) {
            var account = accounts.findByIdAndUserId(card.getAccountId(), userId).orElse(null);
            if (account != null && account.isActive() && request.currency() != null && request.currency().equals(account.getCurrency()))
                suggestedAccount = account.getId();
        }
        var description = request.merchant() == null || request.merchant().isBlank()
                ? (wallet ? "Compra detectada en Wallet" : "Gasto desde Atajos") : request.merchant().trim();
        var date = request.effectiveDate();
        if (request.occurredAt() != null) {
            if (date != null && !date.equals(request.occurredAt().toLocalDate()))
                throw new BadRequestException("La fecha y la hora de la compra no coinciden");
            date = request.occurredAt().toLocalDate();
        }
        apply(row, new Fields(Kind.EXPENSE, description, request.amount(), request.currency(), date, suggestedAccount, null));
        return response(drafts.saveAndFlush(row), true);
    }
    @Transactional
    public Draft update(Long userId, Long id, Update request) {
        lock(userId); var row = owned(userId, id); pending(row, request.version());
        apply(row, request.fields());
        return response(drafts.saveAndFlush(row), true);
    }
    @Transactional
    public Draft assignCard(Long userId, Long id, AssignCard request) {
        lock(userId); var row = owned(userId, id); pending(row, request.version());
        if (!"WALLET".equals(row.getSource())) throw new BadRequestException("Este borrador no proviene de Wallet");
        var card = walletCards.findByIdAndUserId(request.cardId(), userId).orElseThrow(() -> new NotFoundException("La tarjeta no existe"));
        if ("CREDIT".equals(row.getCardKind()) && !"CREDIT".equals(card.getKind()))
            throw new BadRequestException("Una compra de crédito no se puede cambiar a débito");
        row.setCardReference(card.getReference()); row.setCardKind(card.getKind()); row.setAccountId(null);
        var account = accounts.findByIdAndUserId(card.getAccountId(), userId).orElse(null);
        if ("DEBIT".equals(card.getKind()) && account != null && account.isActive() && account.getCurrency().equals(row.getCurrency()))
            row.setAccountId(account.getId());
        return response(drafts.saveAndFlush(row), true);
    }
    @Transactional
    public Draft confirm(Long userId, Long id, Confirm request) {
        lock(userId); var row = owned(userId, id);
        // Retry after a lost response returns the original receipt, never another expense.
        if ("POSTED".equals(row.getStatus())) return response(row, false);
        pending(row, request.version());
        if ("WALLET".equals(row.getSource())) {
            var card = row.getCardReference() == null ? null
                    : walletCards.findByUserIdAndReference(userId, row.getCardReference()).orElse(null);
            if ("CREDIT".equals(row.getCardKind()) || (card != null && "CREDIT".equals(card.getKind())))
                throw new BadRequestException("Es una compra con tarjeta de crédito. Se conserva pendiente; no es una salida de tu cuenta bancaria.");
            if (card == null || !"DEBIT".equals(card.getKind()))
                throw new BadRequestException("Vincula la tarjeta de débito antes de confirmar esta compra.");
            if (!Objects.equals(card.getAccountId(), row.getAccountId()))
                throw new BadRequestException("Selecciona la cuenta vinculada a esta tarjeta de débito.");
        }
        if (!"EXPENSE".equals(row.getKind())) throw new BadRequestException("Registra este movimiento en su módulo y vincúlalo aquí.");
        if (row.getAmount() == null || row.getEffectiveDate() == null || row.getCurrency() == null
                || row.getAccountId() == null || row.getCategoryId() == null)
            throw new BadRequestException("Completa importe, fecha, moneda, cuenta y categoría antes de registrar.");
        if (row.getEffectiveDate().isAfter(LocalDate.now(recurrenceClock.withZone(ZoneId.of("America/Bogota")))))
            throw new BadRequestException("Para un gasto futuro usa Ingresos y gastos fijos.");
        apply(row, fields(row));
        var matches = matches(row);
        if (!token(row, matches).equals(request.reviewToken()))
            throw new ConflictException("Las coincidencias cambiaron. Vuelve a revisar antes de registrar.");
        if (!matches.isEmpty() && !request.distinctPurchase())
            throw new ConflictException("Hay posibles coincidencias. Revisa si este gasto ya está registrado.");
        var transaction = ledger.recordExpense(userId, row.getAccountId(), new FinancialOperationCommand(
                row.getAmount(), row.getEffectiveDate(), row.getDescription(), row.getCurrency(), row.getCategoryId()), null, "VARIABLE");
        row.setStatus("POSTED"); row.setTransactionId(transaction.getId());
        return response(drafts.saveAndFlush(row), false);
    }
    @Transactional
    public Draft link(Long userId, Long id, Link request) {
        lock(userId); var row = owned(userId, id);
        if ("LINKED".equals(row.getStatus()) && Objects.equals(row.getTransactionId(), request.transactionId()))
            return response(row, false);
        pending(row, request.version());
        if (matches(row).stream().noneMatch(match -> "TRANSACTION".equals(match.kind()) && match.id().equals(request.transactionId())))
            throw new ConflictException("El movimiento ya no coincide. Actualiza la revisión.");
        row.setStatus("LINKED"); row.setTransactionId(request.transactionId());
        return response(drafts.saveAndFlush(row), false);
    }
    @Transactional
    public void discard(Long userId, Long id, long version) {
        lock(userId); var row = owned(userId, id);
        if ("DISCARDED".equals(row.getStatus())) return;
        pending(row, version);
        // Preserve the receipt key so replay after an explicit discard cannot recreate the draft.
        row.setStatus("DISCARDED"); row.setDescription("Borrador descartado");
        row.setAmount(null); row.setCurrency(null); row.setEffectiveDate(null); row.setAccountId(null); row.setCategoryId(null);
        row.setCardReference(null); row.setCardKind(null); row.setOccurredAt(null);
        drafts.saveAndFlush(row);
    }
    private void lock(Long userId) {
        users.lockForAlertUpdate(userId).orElseThrow(() -> new NotFoundException("El usuario no existe"));
    }
    private PurchaseDraft owned(Long userId, Long id) {
        return drafts.findByIdAndUserId(id, userId).orElseThrow(() -> new NotFoundException("El borrador no existe"));
    }
    private void pending(PurchaseDraft row, long version) {
        if (!"PENDING".equals(row.getStatus()) || row.getVersion() != version)
            throw new ConflictException("El borrador cambió. Actualiza antes de continuar.");
    }
    private void apply(PurchaseDraft row, Fields fields) {
        if (fields.effectiveDate() != null && (fields.effectiveDate().getYear() < 1900 || fields.effectiveDate().getYear() > 9999))
            throw new BadRequestException("La fecha no es válida");
        if (fields.accountId() != null) {
            var account = accounts.findByIdAndUserId(fields.accountId(), row.getUserId())
                    .orElseThrow(() -> new NotFoundException("La cuenta no existe"));
            if (!account.isActive()) throw new BadRequestException("Elige una cuenta activa");
            if (fields.currency() != null && !account.getCurrency().equals(fields.currency()))
                throw new BadRequestException("La moneda no coincide con la cuenta");
        }
        if (fields.categoryId() != null) {
            var category = categories.findByIdAndUserId(fields.categoryId(), row.getUserId())
                    .orElseThrow(() -> new NotFoundException("La categoría no existe"));
            if (!category.isActive() || category.getType() != CategoryType.EXPENSE)
                throw new BadRequestException("Elige una categoría activa de gastos");
        }
        row.setKind(fields.kind().name()); row.setDescription(fields.description().trim()); row.setAmount(fields.amount());
        row.setCurrency(fields.currency()); row.setEffectiveDate(fields.effectiveDate());
        row.setAccountId(fields.accountId()); row.setCategoryId(fields.categoryId());
    }
    private Fields fields(PurchaseDraft row) {
        return new Fields(Kind.valueOf(row.getKind()), row.getDescription(), row.getAmount(), row.getCurrency(),
                row.getEffectiveDate(), row.getAccountId(), row.getCategoryId());
    }
    private List<Match> matches(PurchaseDraft row) {
        if (row.getAmount() == null || row.getCurrency() == null || row.getEffectiveDate() == null) return List.of();
        var from = row.getEffectiveDate().minusDays(2); var to = row.getEffectiveDate().plusDays(2);
        var result = new ArrayList<Match>(); var seen = new HashSet<Long>();
        for (var entry : matching.transactions(row.getUserId(), row.getCurrency(), row.getAmount(), row.getAccountId(), from, to)) {
            var tx = entry.getFinancialTransaction();
            if (seen.add(tx.getId())) result.add(new Match(tx.getId(), "TRANSACTION", tx.getDescription(), tx.getEffectiveDate(),
                    entry.getSignedAmount().abs(), tx.getCurrency(), entry.getAccount().getName(), tx.getType().name()));
        }
        for (var entry : occurrences.findByRuleUserIdAndStatus(row.getUserId(), RecurringOccurrence.Status.PENDING)) {
            if (entry.getKind() == RecurrenceKind.EXPENSE && entry.getCurrency().equals(row.getCurrency())
                    && entry.getAmount().compareTo(row.getAmount()) == 0 && !entry.getDueDate().isBefore(from) && !entry.getDueDate().isAfter(to)
                    && (row.getAccountId() == null || row.getAccountId().equals(entry.getAccount().getId())))
                result.add(new Match(entry.getId(), "SCHEDULED", entry.getName(), entry.getDueDate(), entry.getAmount(), entry.getCurrency(), entry.getAccount().getName(), null));
        }
        for (var other : drafts.findByUserIdAndStatusAndAmountAndCurrencyAndEffectiveDateBetween(
                row.getUserId(), "PENDING", row.getAmount(), row.getCurrency(), from, to)) {
            if (!other.getId().equals(row.getId()) && (row.getAccountId() == null || other.getAccountId() == null || row.getAccountId().equals(other.getAccountId())))
                result.add(new Match(other.getId(), "DRAFT", other.getDescription(), other.getEffectiveDate(), other.getAmount(), other.getCurrency(), null, null));
        }
        return result;
    }
    private String token(PurchaseDraft row, List<Match> matches) {
        return digest(row.getId() + ":" + row.getVersion() + ":" + matches.stream()
                .map(match -> match.kind() + ":" + match.id()).sorted().toList());
    }
    private Draft response(PurchaseDraft row, boolean review) {
        var matches = review && "PENDING".equals(row.getStatus()) ? matches(row) : List.<Match>of();
        Suggestion suggestion = null;
        if (review && row.getCategoryId() == null && "EXPENSE".equals(row.getKind())) {
            var prior = matching.categories(row.getUserId(), row.getDescription(), PageRequest.of(0, 20));
            var ids = prior.stream().map(tx -> tx.getCategory().getId()).distinct().toList();
            if (ids.size() == 1) suggestion = new Suggestion(ids.getFirst(), prior.getFirst().getCategory().getName());
        }
        return new Draft(row.getId(), row.getVersion(), row.getStatus(), row.getSource(), fields(row), row.getCreatedAt(),
                row.getTransactionId(), matches, token(row, matches), suggestion,
                row.getNativeFingerprint() == null ? null : new Capture(row.getCardReference(), row.getCardKind(), row.getOccurredAt()));
    }
    private static String digest(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
}
