package com.jr.finance.api.alerts;

import com.jr.finance.api.budget.*;
import com.jr.finance.api.credit.*;
import com.jr.finance.api.recurrence.*;
import com.jr.finance.api.reports.*;
import com.jr.finance.api.user.UserRepository;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class AlertSignalsTest {
    @Test void spendingComparisonsKeepCurrenciesPeriodsAndEvidenceSeparate() {
        var users = mock(UserRepository.class);
        when(users.existsById(7L)).thenReturn(true);
        var reports = mock(ReportService.class);
        when(reports.month(7L, 2026, 10)).thenReturn(Map.of("COP", report("120"), "USD", report("80"), "EUR", report("99")));
        when(reports.month(7L, 2026, 9)).thenReturn(Map.of("COP", report("100"), "USD", report("100"), "EUR", report("0")));
        var seen = mock(UserAlertSeenRepository.class);
        var service = new AlertService(users, mock(CreditRepository.class), mock(CreditPlanVsRealService.class),
                seen, mock(BudgetService.class), mock(BudgetRepository.class), mock(RecurringOccurrenceRepository.class),
                reports, Clock.fixed(Instant.parse("2026-10-22T12:00:00Z"), ZoneOffset.UTC));
        var result = service.buildAlerts(7L, 2026, 10, false, List.of());
        assertThat(result).singleElement().satisfies(alert -> {
            assertThat(alert.getCode()).isEqualTo("SPEND_SPIKE");
            assertThat(alert.getData()).containsEntry("currency", "COP").containsEntry("year", 2026)
                    .containsEntry("month", 10).containsEntry("comparison", "PREVIOUS_FULL_MONTH")
                    .containsEntry("currentExpense", new BigDecimal("120"));
            assertThat((BigDecimal) alert.getData().get("differencePercent")).isEqualByComparingTo("20");
        });
        verifyNoInteractions(seen);
        // No prior activity or exactly 15% growth is not an unusual-spending alert.
        when(reports.month(7L, 2026, 10)).thenReturn(Map.of("COP", report("115"), "EUR", report("99")));
        assertThat(service.buildAlerts(7L, 2026, 10, false, List.of())).singleElement()
                .satisfies(alert -> assertThat(alert.getCode()).isEqualTo("ALL_GOOD"));
    }
    private MonthlyCurrencyReport report(String expense) {
        return new MonthlyCurrencyReport(BigDecimal.ZERO, new BigDecimal(expense), Map.of());
    }
}
