package com.jr.finance.api.recurrence;

import com.jr.finance.api.account.AccountRepository;
import com.jr.finance.api.common.FinancialPeriod;
import com.jr.finance.api.common.exception.*;
import com.jr.finance.api.expense.CategoryRepository;
import com.jr.finance.api.expense.CategoryType;
import com.jr.finance.api.ledger.FinancialTransactionStatus;
import com.jr.finance.api.user.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import static com.jr.finance.api.recurrence.RecurrenceDtos.*;

@Service @RequiredArgsConstructor
public class RecurrenceService {
    private final RecurringRuleRepository rules;
    private final RecurringOccurrenceRepository occurrences;
    private final AccountRepository accounts;
    private final CategoryRepository categories;
    private final RecurrenceWorker worker;
    private final EntityManager entityManager;
    private final Clock recurrenceClock;

    @Transactional
    public Rule create(Long userId, SaveRule request) {
        // Serialize identical create retries, including concurrent requests with the same key.
        User user = entityManager.find(User.class, userId, LockModeType.PESSIMISTIC_WRITE);
        if (user == null) throw new NotFoundException("El usuario no existe");
        var existing = rules.findByUserIdAndRequestKey(userId, request.requestKey());
        if (existing.isPresent()) return response(existing.get());
        RecurringRule rule = new RecurringRule();
        rule.setUser(user);
        rule.setRequestKey(request.requestKey());
        apply(rule, request);
        rules.saveAndFlush(rule);
        worker.process(rule.getId());
        rules.flush();
        return response(rule);
    }

    @Transactional
    public Rule update(Long userId, Long id, SaveRule request) {
        RecurringRule rule = worker.owned(userId, id);
        checkVersion(rule, request.version());
        worker.process(id); // Preserve already-due occurrences using their original amount and account.
        apply(rule, request);
        while (occurrences.findByRuleIdAndDueDate(id, rule.getNextDate()).isPresent())
            rule.setNextDate(RecurrenceDates.next(rule, rule.getNextDate()));
        rules.saveAndFlush(rule);
        worker.process(id);
        rules.flush();
        return response(rule);
    }

    private void apply(RecurringRule rule, SaveRule request) {
        ZoneId zone;
        try { zone = ZoneId.of(request.timeZone()); }
        catch (DateTimeException exception) { throw new BadRequestException("Selecciona una zona horaria válida"); }
        LocalDate today = LocalDate.now(recurrenceClock.withZone(zone));
        if (request.startDate().isBefore(today))
            throw new BadRequestException("La primera fecha debe ser hoy o posterior. No se recrean pagos pasados.");
        if (request.startDate().getYear() > 2100 || (request.endDate() != null
                && (request.endDate().isBefore(request.startDate()) || request.endDate().getYear() > 2100)))
            throw new BadRequestException("Revisa las fechas de inicio y fin");
        if (request.frequency() == RecurrenceFrequency.SEMIMONTHLY
                && (request.firstDay() > 27 || request.secondDay() == null || request.secondDay() <= request.firstDay()))
            throw new BadRequestException("Elige dos días distintos: el primero entre 1 y 27 y el segundo posterior");
        var account = accounts.findByIdAndUserId(request.accountId(), rule.getUser().getId())
                .orElseThrow(() -> new NotFoundException("La cuenta no existe"));
        if (!account.isActive()) throw new BadRequestException("La cuenta está inactiva");
        var category = request.categoryId() == null ? null : categories.findByIdAndUserId(request.categoryId(), rule.getUser().getId())
                .orElseThrow(() -> new NotFoundException("La categoría no existe"));
        if (request.kind() == RecurrenceKind.EXPENSE && category == null)
            throw new BadRequestException("Selecciona una categoría de gasto");
        if (category != null && (!category.isActive() || category.getType() !=
                (request.kind() == RecurrenceKind.INCOME ? CategoryType.INCOME : CategoryType.EXPENSE)))
            throw new BadRequestException("Selecciona una categoría activa del mismo tipo");
        rule.setName(request.name().trim());
        rule.setKind(request.kind());
        rule.setFrequency(request.frequency());
        rule.setMode(request.mode());
        rule.setAmount(request.amount());
        rule.setAccount(account);
        rule.setCategory(category);
        rule.setCurrency(account.getCurrency());
        rule.setTimeZone(zone.getId());
        rule.setStartDate(request.startDate());
        rule.setEndDate(request.endDate());
        rule.setFirstDay(request.firstDay());
        rule.setSecondDay(request.frequency() == RecurrenceFrequency.SEMIMONTHLY ? request.secondDay() : null);
        rule.setNextDate(RecurrenceDates.onOrAfter(rule.getFrequency(), rule.getStartDate(),
                rule.getFirstDay(), rule.getSecondDay(), rule.getStartDate()));
        if (rule.getEndDate() != null && rule.getNextDate().isAfter(rule.getEndDate()))
            throw new BadRequestException("No hay fechas de pago entre el inicio y el fin elegidos");
    }

    @Transactional(readOnly = true)
    public List<Rule> list(Long userId) {
        return rules.findByUserIdOrderByActiveDescNameAsc(userId).stream().map(this::response).toList();
    }

    @Transactional
    public Rule setActive(Long userId, Long id, SetActive request) {
        RecurringRule rule = worker.owned(userId, id);
        checkVersion(rule, request.version());
        if (request.active() && !rule.isActive()) {
            rule.setNextDate(RecurrenceDates.onOrAfter(rule.getFrequency(), rule.getStartDate(),
                    rule.getFirstDay(), rule.getSecondDay(), worker.today(rule)));
            if (rule.getEndDate() != null && rule.getNextDate().isAfter(rule.getEndDate()))
                throw new BadRequestException("La programación terminó. Edita la fecha de fin antes de reanudar.");
        }
        rule.setActive(request.active());
        rules.saveAndFlush(rule);
        return response(rule);
    }

    @Transactional(readOnly = true)
    public Agenda agenda(Long userId, int year, int month) {
        YearMonth period = FinancialPeriod.of(year, month);
        List<Entry> entries = new ArrayList<>(occurrences.agenda(userId, period.atDay(1), period.atEndOfMonth())
                .stream().map(this::entry).toList());
        for (RecurringRule rule : rules.findByUserIdOrderByActiveDescNameAsc(userId)) {
            if (!rule.isActive()) continue;
            LocalDate date = RecurrenceDates.onOrAfter(rule.getFrequency(), rule.getStartDate(), rule.getFirstDay(),
                    rule.getSecondDay(), rule.getNextDate().isAfter(period.atDay(1)) ? rule.getNextDate() : period.atDay(1));
            while (!date.isAfter(period.atEndOfMonth()) && (rule.getEndDate() == null || !date.isAfter(rule.getEndDate()))) {
                LocalDate due = date;
                if (entries.stream().noneMatch(e -> e.ruleId().equals(rule.getId()) && e.dueDate().equals(due))) {
                    entries.add(new Entry(null, rule.getId(), rule.getName(), rule.getKind(), rule.getMode(), date,
                            rule.getAmount(), rule.getCurrency(), rule.getAccount().getId(), rule.getAccount().getName(),
                            date.isAfter(worker.today(rule)) ? "PLANNED" : "PENDING", null, null, null));
                }
                date = RecurrenceDates.next(rule, date);
            }
        }
        entries.sort(Comparator.comparing(Entry::dueDate).thenComparing(Entry::ruleId));
        return new Agenda(entries);
    }

    @Transactional
    public Entry confirm(Long userId, Long id, LocalDate dueDate, Confirm request) {
        RecurringRule rule = worker.owned(userId, id);
        if (dueDate.isAfter(worker.today(rule)) || request.date().isAfter(worker.today(rule)) || request.date().isBefore(dueDate))
            throw new BadRequestException("Confirma desde el día programado y usa la fecha en que realmente ocurrió");
        worker.process(id);
        RecurringOccurrence occurrence = occurrences.findByRuleIdAndDueDate(id, dueDate)
                .orElseThrow(() -> new NotFoundException("El pago pendiente no existe"));
        if (occurrence.getStatus() == RecurringOccurrence.Status.POSTED) return entry(occurrence);
        if (occurrence.getStatus() == RecurringOccurrence.Status.SKIPPED) throw new ConflictException("Este pago ya se omitió");
        worker.post(occurrence, request.amount(), request.date());
        occurrences.saveAndFlush(occurrence);
        return entry(occurrence);
    }

    @Transactional
    public Entry skip(Long userId, Long id, LocalDate dueDate) {
        worker.owned(userId, id);
        worker.process(id);
        RecurringOccurrence occurrence = occurrences.findByRuleIdAndDueDate(id, dueDate)
                .orElseThrow(() -> new NotFoundException("El pago pendiente no existe"));
        if (occurrence.getStatus() == RecurringOccurrence.Status.POSTED)
            throw new ConflictException("El movimiento ya se registró. Consúltalo en Movimientos.");
        occurrence.setStatus(RecurringOccurrence.Status.SKIPPED);
        occurrence.setIssue(null);
        return entry(occurrence);
    }

    private void checkVersion(RecurringRule rule, Long version) {
        if (!Objects.equals(rule.getVersion(), version)) throw new ConflictException("La programación cambió. Actualiza antes de editar.");
    }
    @Transactional(readOnly = true)
    public Upcoming upcoming(Long userId, String timeZone) {
        ZoneId zone;
        try { zone = ZoneId.of(timeZone); }
        catch (DateTimeException exception) { throw new BadRequestException("Selecciona una zona horaria válida"); }
        LocalDate from = LocalDate.now(recurrenceClock.withZone(zone));
        LocalDate to = from.plusDays(6);
        Map<String, Entry> unique = new LinkedHashMap<>();
        for (YearMonth month = YearMonth.from(from); !month.isAfter(YearMonth.from(to)); month = month.plusMonths(1)) {
            for (Entry entry : agenda(userId, month.getYear(), month.getMonthValue()).entries()) {
                if (!entry.dueDate().isBefore(from) && !entry.dueDate().isAfter(to)
                        && (entry.status().equals("PLANNED") || entry.status().equals("PENDING")))
                    unique.put(entry.ruleId() + ":" + entry.dueDate(), entry);
            }
        }
        var items = unique.values().stream().sorted(Comparator.comparing(Entry::dueDate).thenComparing(Entry::ruleId)).toList();
        return new Upcoming(from, to, items.stream().limit(3).toList(), items.size());
    }
    private String state(RecurringRule r) {
        if (r.getEndDate() != null && (r.getNextDate().isAfter(r.getEndDate()) || worker.today(r).isAfter(r.getEndDate())))
            return "FINISHED";
        return r.isActive() ? "ACTIVE" : "PAUSED";
    }
    private Rule response(RecurringRule r) {
        return new Rule(r.getId(), r.getName(), r.getKind(), r.getFrequency(), r.getMode(), r.getAmount(),
                r.getAccount().getId(), r.getAccount().getName(), r.getCategory() == null ? null : r.getCategory().getId(),
                r.getCurrency(), r.getTimeZone(), r.getStartDate(), r.getEndDate(), r.getFirstDay(), r.getSecondDay(),
                r.getNextDate(), r.isActive(), r.getVersion(), r.getRequestKey(), state(r));
    }
    private Entry entry(RecurringOccurrence o) {
        boolean reversed = o.getTransaction() != null && o.getTransaction().getStatus() != FinancialTransactionStatus.POSTED;
        return new Entry(o.getId(), o.getRule().getId(), o.getName(), o.getKind(), o.getRule().getMode(), o.getDueDate(),
                o.getAmount(), o.getCurrency(), o.getAccount().getId(), o.getAccount().getName(),
                reversed ? "REVERSED" : o.getStatus().name(), o.getIssue(),
                o.getTransaction() == null ? null : o.getTransaction().getId(),
                o.getTransaction() == null ? null : o.getTransaction().getEffectiveDate());
    }
}
