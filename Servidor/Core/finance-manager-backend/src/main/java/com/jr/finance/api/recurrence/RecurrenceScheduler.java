package com.jr.finance.api.recurrence;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.Clock;
import java.time.LocalDate;

@Component @EnableScheduling @RequiredArgsConstructor @Slf4j
@ConditionalOnProperty(name = "finance.recurrences.enabled", havingValue = "true", matchIfMissing = true)
public class RecurrenceScheduler {
    private final RecurringRuleRepository rules;
    private final RecurrenceWorker worker;
    private final Clock recurrenceClock;

    @Scheduled(initialDelay = 10000, fixedDelayString = "${finance.recurrences.interval-ms:60000}")
    public void run() {
        // UTC + one day covers all local dates. Each rule checks its own time zone before posting.
        for (Long id : rules.dueIds(LocalDate.now(recurrenceClock).plusDays(1))) {
            try { worker.process(id); }
            catch (RuntimeException exception) {
                log.warn("No se pudo procesar la recurrencia {}; se reintentará en el siguiente ciclo.", id, exception);
            }
        }
    }
}
