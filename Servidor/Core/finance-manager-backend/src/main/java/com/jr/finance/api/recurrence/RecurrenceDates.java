package com.jr.finance.api.recurrence;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;

/** Calendar dates, never elapsed hours. Day 31 means the last available day of a short month. */
public final class RecurrenceDates {
    private RecurrenceDates() {}

    public static LocalDate onOrAfter(RecurrenceFrequency frequency, LocalDate anchor,
                                      int firstDay, Integer secondDay, LocalDate from) {
        LocalDate lower = from.isBefore(anchor) ? anchor : from;
        if (frequency == RecurrenceFrequency.WEEKLY || frequency == RecurrenceFrequency.BIWEEKLY) {
            int interval = frequency == RecurrenceFrequency.WEEKLY ? 7 : 14;
            long elapsed = ChronoUnit.DAYS.between(anchor, lower);
            return anchor.plusDays(((elapsed + interval - 1) / interval) * interval);
        }
        YearMonth month = YearMonth.from(lower);
        LocalDate first = month.atDay(Math.min(firstDay, month.lengthOfMonth()));
        if (!first.isBefore(lower)) return first;
        if (frequency == RecurrenceFrequency.SEMIMONTHLY) {
            LocalDate second = month.atDay(Math.min(secondDay, month.lengthOfMonth()));
            if (!second.isBefore(lower)) return second;
        }
        month = month.plusMonths(1);
        return month.atDay(Math.min(firstDay, month.lengthOfMonth()));
    }

    public static LocalDate next(RecurringRule rule, LocalDate after) {
        return onOrAfter(rule.getFrequency(), rule.getStartDate(), rule.getFirstDay(),
                rule.getSecondDay(), after.plusDays(1));
    }
}
