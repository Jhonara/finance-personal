package com.jr.finance.api.alerts;

import com.jr.finance.api.alerts.dto.*;
import com.jr.finance.api.auth.JwtService;
import com.jr.finance.api.user.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import java.time.*;
import java.util.*;
import java.nio.file.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:alert_lifecycle;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc @ActiveProfiles("test")
class AlertLifecycleIntegrationTest {
    @Autowired AlertLifecycleService lifecycle;
    @Autowired FinancialAlertStateRepository states;
    @Autowired UserRepository users; @Autowired RoleRepository roles;
    @Autowired MockMvc mvc; @Autowired JwtService jwt;
    @MockitoBean AlertService signals;
    @MockitoBean(name = "recurrenceClock") Clock clock;
    User owner; List<AlertResponse> current; Instant now;
    @BeforeEach void setup() {
        owner = user(); now = Instant.parse("2026-10-22T16:00:00Z");
        when(clock.instant()).thenAnswer(i -> now);
        when(clock.withZone(any())).thenAnswer(i -> Clock.fixed(now, i.getArgument(0)));
        current = List.of(credit(1));
        when(signals.buildAlerts(eq(owner.getId()), anyInt(), anyInt(), eq(true))).thenAnswer(i -> current);
    }
    @Test void readingKeepsConditionActiveAndNeverReportsAllGood() {
        var first = lifecycle.list(owner.getId(), false).getFirst();
        lifecycle.update(owner.getId(), first.getId(), new UpdateAlertRequest(first.getRevision(), UpdateAlertRequest.Action.READ));
        var after = lifecycle.list(owner.getId(), false).getFirst();
        assertThat(after.getCode()).isEqualTo("CREDIT_BEHIND");
        assertThat(after.isRead()).isTrue(); assertThat(after.getState()).isEqualTo("ACTIVE");
        assertThat(states.findByUserId(owner.getId())).hasSize(1);
    }
    @Test void snoozingExpiresAtNextBogotaDayAndNewInstallmentReactivatesIt() {
        var first = lifecycle.list(owner.getId(), false).getFirst();
        var snoozed = lifecycle.update(owner.getId(), first.getId(), new UpdateAlertRequest(0L, UpdateAlertRequest.Action.SNOOZE));
        assertThat(snoozed.getSnoozedUntil()).isEqualTo(Instant.parse("2026-10-23T05:00:00Z"));
        assertThat(lifecycle.list(owner.getId(), false).getFirst().getState()).isEqualTo("SNOOZED");
        now = Instant.parse("2026-10-23T05:00:00Z");
        assertThat(lifecycle.list(owner.getId(), false).getFirst().getState()).isEqualTo("ACTIVE");
        lifecycle.update(owner.getId(), first.getId(), new UpdateAlertRequest(0L, UpdateAlertRequest.Action.SNOOZE));
        current = List.of(credit(2));
        var next = lifecycle.list(owner.getId(), false).getFirst();
        assertThat(next.getState()).isEqualTo("ACTIVE"); assertThat(next.getRevision()).isEqualTo(1);
        assertThat(next.getSnoozedUntil()).isNull(); assertThat(next.isRead()).isFalse();
    }
    @Test void clearedConditionsMoveToHistoryAndReopenUnreadWithoutDuplicates() {
        var first = lifecycle.list(owner.getId(), false).getFirst();
        lifecycle.update(owner.getId(), first.getId(), new UpdateAlertRequest(0L, UpdateAlertRequest.Action.READ));
        current = List.of();
        assertThat(lifecycle.list(owner.getId(), false).getFirst().getCode()).isEqualTo("ALL_GOOD");
        assertThat(lifecycle.list(owner.getId(), true).getFirst().getState()).isEqualTo("RESOLVED");
        current = List.of(credit(1));
        var reopened = lifecycle.list(owner.getId(), false).getFirst();
        assertThat(reopened.getId()).isEqualTo(first.getId()); assertThat(reopened.isRead()).isFalse();
        assertThat(lifecycle.list(owner.getId(), true)).isEmpty();
    }
    @Test void monthRolloverArchivesOldWarningAndCreatesNewPeriod() {
        current = List.of(spike(10)); lifecycle.list(owner.getId(), false);
        now = Instant.parse("2026-11-01T05:00:00Z"); current = List.of(spike(11));
        assertThat(lifecycle.list(owner.getId(), false)).hasSize(1);
        var old = lifecycle.list(owner.getId(), true).getFirst();
        assertThat(old.getState()).isEqualTo("ARCHIVED"); assertThat(old.getData().get("month")).isEqualTo(10);
    }
    @Test void budgetEscalationUpdatesOneWarningAndClearsSnooze() {
        current = List.of(new AlertResponse("BUDGET_WARNING", "WARNING", 80, "Aviso", Map.of("budgetId", 8, "year", 2026, "month", 10)));
        var first = lifecycle.list(owner.getId(), false).getFirst();
        lifecycle.update(owner.getId(), first.getId(), new UpdateAlertRequest(0L, UpdateAlertRequest.Action.SNOOZE));
        current = List.of(new AlertResponse("BUDGET_EXCEEDED", "WARNING", 95, "Excedido", Map.of("budgetId", 8, "year", 2026, "month", 10)));
        var next = lifecycle.list(owner.getId(), false).getFirst();
        assertThat(next.getId()).isEqualTo(first.getId()); assertThat(next.getCode()).isEqualTo("BUDGET_EXCEEDED");
        assertThat(next.getState()).isEqualTo("ACTIVE"); assertThat(states.findByUserId(owner.getId())).hasSize(1);
    }
    @Test void httpProtectsOwnerRejectsStaleActionsAndValidatesRequests() throws Exception {
        var first = lifecycle.list(owner.getId(), false).getFirst(); var other = user();
        when(signals.buildAlerts(eq(other.getId()), anyInt(), anyInt(), eq(true))).thenReturn(List.of());
        update(other, first.getId(), "{\"revision\":0,\"action\":\"READ\"}").andExpect(status().isNotFound());
        update(owner, first.getId(), "{\"revision\":0,\"action\":\"INVALID\"}").andExpect(status().isBadRequest());
        update(owner, first.getId(), "{\"action\":\"READ\"}").andExpect(status().isBadRequest());
        current = List.of(credit(2));
        update(owner, first.getId(), "{\"revision\":0,\"action\":\"SNOOZE\"}").andExpect(status().isConflict());
        mvc.perform(get("/api/v1/alerts")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/alerts/history").header("Authorization", bearer(other)))
                .andExpect(status().isOk()).andExpect(content().json("[]"));
    }
    @Test void httpReadSnoozeAndResumeDoNotResolveAndExposeStructuredEvidence() throws Exception {
        var first = lifecycle.list(owner.getId(), false).getFirst();
        update(owner, first.getId(), "{\"revision\":0,\"action\":\"READ\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.read").value(true)).andExpect(jsonPath("$.state").value("ACTIVE"));
        update(owner, first.getId(), "{\"revision\":0,\"action\":\"SNOOZE\"}").andExpect(status().isOk());
        update(owner, first.getId(), "{\"revision\":0,\"action\":\"RESUME\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.state").value("ACTIVE"));
        mvc.perform(get("/api/v1/alerts").header("Authorization", bearer(owner)))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].data.creditId").value(7))
                .andExpect(jsonPath("$[0].checkedAt").exists());
    }
    @Test void exportsContract() throws Exception {
        var json = mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        Files.writeString(Path.of("target/alerts-openapi.json"), json);
    }
    private AlertResponse credit(int installments) { return new AlertResponse("CREDIT_BEHIND", "WARNING", 90, "Pendiente",
            Map.of("creditId", 7, "creditName", "Casa", "currency", "COP", "plannedInstallments", installments)); }
    private AlertResponse spike(int month) { return new AlertResponse("SPEND_SPIKE", "WARNING", 60, "Gastos",
            Map.of("year", 2026, "month", month, "currency", "COP")); }
    private org.springframework.test.web.servlet.ResultActions update(User user, Long id, String body) throws Exception {
        return mvc.perform(post("/api/v1/alerts/{id}/state", id).header("Authorization", bearer(user))
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }
    private User user() {
        Role role = roles.findByName("USER").orElseGet(() -> { Role r = new Role(); r.setName("USER"); return roles.saveAndFlush(r); });
        User u = new User(); u.setName("Alert test"); u.setEmail(UUID.randomUUID() + "@test.local");
        u.setPassword("unused"); u.getRoles().add(role); return users.saveAndFlush(u);
    }
    private String bearer(User user) { return "Bearer " + jwt.generateToken(user.getEmail()); }
}
