package com.jr.finance.api.recurrence;

import com.jr.finance.api.common.exception.BadRequestException;
import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.account.AccountRepository;
import com.jr.finance.api.expense.CategoryType;
import com.jr.finance.api.ledger.FinancialOperationCommand;
import com.jr.finance.api.ledger.LedgerService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;

@Service @RequiredArgsConstructor
public class RecurrenceWorker {
    private final RecurringRuleRepository rules;
    private final RecurringOccurrenceRepository occurrences;
    private final LedgerService ledger;
    private final AccountRepository accounts;
    private final Clock recurrenceClock;

    public LocalDate today(RecurringRule rule) {
        return LocalDate.now(recurrenceClock.withZone(ZoneId.of(rule.getTimeZone())));
    }

    /** The rule lock serializes scheduler, edits, confirmations and skips across server instances. */
    @Transactional
    public void process(Long id) {
        RecurringRule rule = rules.lock(id).orElse(null);
        if (rule == null || !rule.isActive()) return;
        LocalDate today = today(rule);
        int processed = 0;
        while (!rule.getNextDate().isAfter(today) && processed++ < 120) {
            LocalDate due = rule.getNextDate();
            if (rule.getEndDate() != null && due.isAfter(rule.getEndDate())) {
                rule.setActive(false);
                break;
            }
            if (occurrences.findByRuleIdAndDueDate(id, due).isEmpty()) {
                RecurringOccurrence occurrence = new RecurringOccurrence();
                occurrence.setRule(rule);
                occurrence.setDueDate(due);
                occurrence.setName(rule.getName());
                occurrence.setKind(rule.getKind());
                occurrence.setAmount(rule.getAmount());
                occurrence.setCurrency(rule.getCurrency());
                occurrence.setAccount(rule.getAccount());
                occurrence.setCategory(rule.getCategory());
                if (rule.getMode() == RecurrenceMode.AUTOMATIC) {
                    accounts.findByIdAndUserIdForUpdate(rule.getAccount().getId(), rule.getUser().getId());
                    String issue = unavailable(occurrence);
                    if (issue == null && occurrence.getKind() == RecurrenceKind.EXPENSE
                            && ledger.getAccountBalance(rule.getUser().getId(), occurrence.getAccount().getId())
                            .compareTo(occurrence.getAmount()) < 0) {
                        issue = "Saldo registrado insuficiente. Confirma si el pago ya se realizó.";
                    }
                    if (issue == null) post(occurrence, occurrence.getAmount(), due);
                    else occurrence.setIssue(issue);
                }
                occurrences.saveAndFlush(occurrence);
            }
            rule.setNextDate(RecurrenceDates.next(rule, due));
        }
        if (rule.getEndDate() != null && rule.getNextDate().isAfter(rule.getEndDate())) rule.setActive(false);
    }

    String unavailable(RecurringOccurrence occurrence) {
        if (!occurrence.getAccount().isActive()) return "La cuenta está inactiva. Reactívala para registrar este pago.";
        if (!occurrence.getCurrency().equals(occurrence.getAccount().getCurrency()))
            return "La moneda de la cuenta cambió. Revisa esta programación.";
        if (occurrence.getCategory() != null && (!occurrence.getCategory().isActive()
                || occurrence.getCategory().getType() != (occurrence.getKind() == RecurrenceKind.INCOME
                ? CategoryType.INCOME : CategoryType.EXPENSE)))
            return "La categoría no está disponible. Reactívala o deja este pago sin registrar.";
        return null;
    }

    void post(RecurringOccurrence occurrence, BigDecimal amount, LocalDate date) {
        String issue = unavailable(occurrence);
        if (issue != null) throw new BadRequestException(issue);
        var command = new FinancialOperationCommand(amount, date, occurrence.getName() + " · Recurrente",
                occurrence.getCurrency(), occurrence.getCategory() == null ? null : occurrence.getCategory().getId());
        Long userId = occurrence.getRule().getUser().getId();
        var transaction = occurrence.getKind() == RecurrenceKind.INCOME
                ? ledger.recordIncome(userId, occurrence.getAccount().getId(), command)
                : ledger.recordExpense(userId, occurrence.getAccount().getId(), command, null, "FIXED");
        occurrence.setAmount(amount);
        occurrence.setTransaction(transaction);
        occurrence.setStatus(RecurringOccurrence.Status.POSTED);
        occurrence.setIssue(null);
    }

    RecurringRule owned(Long userId, Long id) {
        RecurringRule rule = rules.lock(id).orElseThrow(() -> new NotFoundException("La programación no existe"));
        if (!rule.getUser().getId().equals(userId)) throw new NotFoundException("La programación no existe");
        return rule;
    }
}
