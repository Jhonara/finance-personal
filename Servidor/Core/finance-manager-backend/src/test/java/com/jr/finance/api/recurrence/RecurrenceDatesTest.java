package com.jr.finance.api.recurrence;

import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import static org.assertj.core.api.Assertions.assertThat;

class RecurrenceDatesTest {
    @Test void monthEndDoesNotDriftAfterFebruary() {
        var anchor = LocalDate.of(2027, 1, 31);
        assertThat(RecurrenceDates.onOrAfter(RecurrenceFrequency.MONTHLY, anchor, 31, null, anchor.plusDays(1)))
                .isEqualTo("2027-02-28");
        assertThat(RecurrenceDates.onOrAfter(RecurrenceFrequency.MONTHLY, anchor, 31, null, LocalDate.of(2027, 3, 1)))
                .isEqualTo("2027-03-31");
        assertThat(RecurrenceDates.onOrAfter(RecurrenceFrequency.MONTHLY, anchor, 31, null, LocalDate.of(2028, 2, 1)))
                .isEqualTo("2028-02-29");
    }
    @Test void semimonthlyIsNotEveryFourteenDays() {
        var anchor = LocalDate.of(2027, 1, 15);
        assertThat(RecurrenceDates.onOrAfter(RecurrenceFrequency.SEMIMONTHLY, anchor, 15, 31, anchor.plusDays(1)))
                .isEqualTo("2027-01-31");
        assertThat(RecurrenceDates.onOrAfter(RecurrenceFrequency.BIWEEKLY, anchor, 15, null, anchor.plusDays(1)))
                .isEqualTo("2027-01-29");
        assertThat(RecurrenceDates.onOrAfter(RecurrenceFrequency.SEMIMONTHLY, anchor, 15, 31, LocalDate.of(2027, 2, 16)))
                .isEqualTo("2027-02-28");
    }
    @Test void weeklyRetainsItsAnchorAcrossYearBoundary() {
        var anchor = LocalDate.of(2026, 12, 31);
        assertThat(RecurrenceDates.onOrAfter(RecurrenceFrequency.WEEKLY, anchor, 31, null, LocalDate.of(2027, 1, 1)))
                .isEqualTo("2027-01-07");
    }
}
