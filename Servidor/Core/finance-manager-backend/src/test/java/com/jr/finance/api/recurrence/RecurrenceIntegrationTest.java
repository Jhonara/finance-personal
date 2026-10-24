package com.jr.finance.api.recurrence;

import com.jr.finance.api.account.*;
import com.jr.finance.api.auth.JwtService;
import com.jr.finance.api.common.exception.*;
import com.jr.finance.api.expense.*;
import com.jr.finance.api.income.IncomeService;
import com.jr.finance.api.ledger.*;
import com.jr.finance.api.user.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import java.math.BigDecimal;
import java.nio.file.*;
import java.time.*;
import java.util.UUID;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static com.jr.finance.api.recurrence.RecurrenceDtos.*;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:recurrence_test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc @ActiveProfiles("test")
@Import(RecurrenceIntegrationTest.TimeConfiguration.class)
class RecurrenceIntegrationTest {
    static class MutableClock extends Clock {
        Instant now = Instant.parse("2026-10-20T15:00:00Z");
        public ZoneId getZone() { return ZoneOffset.UTC; }
        public Clock withZone(ZoneId zone) { return Clock.fixed(now, zone); }
        public Instant instant() { return now; }
    }
    @TestConfiguration static class TimeConfiguration {
        @Bean @Primary MutableClock testClock() { return new MutableClock(); }
    }
    @Autowired MutableClock clock;
    @Autowired RecurrenceService service;
    @Autowired RecurrenceWorker worker;
    @Autowired RecurringRuleRepository rules;
    @Autowired RecurringOccurrenceRepository occurrences;
    @Autowired UserRepository users;
    @Autowired RoleRepository roles;
    @Autowired AccountRepository accounts;
    @Autowired CategoryRepository categories;
    @Autowired LedgerService ledger;
    @Autowired IncomeService incomes;
    @Autowired ExpenseService expenses;
    @Autowired MockMvc mvc;
    @Autowired JwtService jwt;
    @Autowired com.jr.finance.api.alerts.AlertService alerts;
    @Autowired com.jr.finance.api.transaction.TransactionService transactionHistory;
    @Autowired com.jr.finance.api.reports.ReportService reports;
    User user;
    Account account;
    Category category;
    final LocalDate today = LocalDate.of(2026, 10, 20);

    @BeforeEach void setup() {
        clock.now = Instant.parse("2026-10-20T15:00:00Z");
        user = new User(); user.setName("Recurrence test");
        user.setEmail(UUID.randomUUID() + "@test.local"); user.setPassword("unused");
        Role role = roles.findByName("USER").orElseGet(() -> { var r = new Role(); r.setName("USER"); return roles.saveAndFlush(r); });
        user.getRoles().add(role); user = users.saveAndFlush(user);
        account = new Account(); account.setUser(user); account.setName("Cuenta");
        account.setType(AccountType.BANK); account.setCurrency("COP"); account.setActive(true);
        account = accounts.saveAndFlush(account);
        category = new Category(); category.setUser(user); category.setName("Internet");
        category.setType(CategoryType.EXPENSE); category.setActive(true); category = categories.saveAndFlush(category);
    }
    SaveRule request(RecurrenceKind kind, RecurrenceMode mode, LocalDate start) {
        return new SaveRule("Salario o servicio", kind, RecurrenceFrequency.MONTHLY, mode, new BigDecimal("100"),
                account.getId(), kind == RecurrenceKind.EXPENSE ? category.getId() : null, "America/Bogota",
                start, null, start.getDayOfMonth(), null, UUID.randomUUID().toString(), null);
    }
    @Test void futureDoesNotAffectBalancesOrReportsAndDueIsPostedOnlyOnce() {
        var request = request(RecurrenceKind.INCOME, RecurrenceMode.AUTOMATIC, today.plusDays(1));
        var rule = service.create(user.getId(), request);
        assertThat(service.agenda(user.getId(), 2026, 10).entries()).singleElement().satisfies(e -> assertThat(e.status()).isEqualTo("PLANNED"));
        worker.process(rule.id());
        assertThat(ledger.getAccountBalance(user.getId(), account.getId())).isZero();
        assertThat(incomes.totalByPeriod(user.getId(), today, today.plusMonths(1))).isZero();
        clock.now = Instant.parse("2026-10-21T05:01:00Z");
        worker.process(rule.id()); worker.process(rule.id());
        assertThat(ledger.getAccountBalance(user.getId(), account.getId())).isEqualByComparingTo("100");
        assertThat(incomes.totalByPeriod(user.getId(), today.plusDays(1), today.plusDays(1))).isEqualByComparingTo("100");
        assertThat(service.create(user.getId(), request).id()).isEqualTo(rule.id());
        assertThat(service.agenda(user.getId(), 2026, 10).entries()).hasSize(1);
    }
    @Test void bogotaMidnightNotUtcControlsPosting() {
        var rule = service.create(user.getId(), request(RecurrenceKind.INCOME, RecurrenceMode.AUTOMATIC, today.plusDays(1)));
        clock.now = Instant.parse("2026-10-21T03:00:00Z");
        worker.process(rule.id());
        assertThat(ledger.getAccountBalance(user.getId(), account.getId())).isZero();
        clock.now = Instant.parse("2026-10-21T05:00:00Z");
        worker.process(rule.id());
        assertThat(ledger.getAccountBalance(user.getId(), account.getId())).isEqualByComparingTo("100");
    }
    @Test void variableExpenseWaitsForConfirmationAndUsesActualAmountAndDate() {
        var rule = service.create(user.getId(), request(RecurrenceKind.EXPENSE, RecurrenceMode.CONFIRM, today));
        assertThat(ledger.getAccountBalance(user.getId(), account.getId())).isZero();
        clock.now = Instant.parse("2026-11-02T15:00:00Z");
        assertThat(service.agenda(user.getId(), 2026, 11).entries()).anySatisfy(e -> assertThat(e.dueDate()).isEqualTo(today));
        var confirmation = new Confirm(new BigDecimal("120"), LocalDate.of(2026, 11, 2));
        var entry = service.confirm(user.getId(), rule.id(), today, confirmation);
        assertThat(service.confirm(user.getId(), rule.id(), today, confirmation).transactionId()).isEqualTo(entry.transactionId());
        assertThat(expenses.totalByPeriod(user.getId(), today, today.withDayOfMonth(31))).isZero();
        assertThat(expenses.totalByPeriod(user.getId(), confirmation.date(), confirmation.date())).isEqualByComparingTo("120");
    }
    @Test void failuresStayPendingAndDoNotPoisonOtherRules() {
        var rule = service.create(user.getId(), request(RecurrenceKind.EXPENSE, RecurrenceMode.AUTOMATIC, today));
        assertThat(service.agenda(user.getId(), 2026, 10).entries()).singleElement().satisfies(e -> {
            assertThat(e.status()).isEqualTo("PENDING");
            assertThat(e.issue()).contains("insuficiente");
        });
        service.create(user.getId(), request(RecurrenceKind.INCOME, RecurrenceMode.AUTOMATIC, today));
        worker.process(rule.id());
        assertThat(ledger.getAccountBalance(user.getId(), account.getId())).isEqualByComparingTo("100");
        service.skip(user.getId(), rule.id(), today);
        service.skip(user.getId(), rule.id(), today);
        assertThat(service.agenda(user.getId(), 2026, 10).entries()).anySatisfy(e -> assertThat(e.status()).isEqualTo("SKIPPED"));
    }
    @Test void inactiveAccountsWaitAndCanBeConfirmedAfterReactivation() {
        var rule = service.create(user.getId(), request(RecurrenceKind.INCOME, RecurrenceMode.AUTOMATIC, today.plusDays(1)));
        account.setActive(false); account = accounts.saveAndFlush(account);
        clock.now = Instant.parse("2026-10-21T15:00:00Z");
        worker.process(rule.id());
        assertThat(service.agenda(user.getId(), 2026, 10).entries()).singleElement().satisfies(e -> assertThat(e.issue()).contains("inactiva"));
        account.setActive(true); accounts.saveAndFlush(account);
        service.confirm(user.getId(), rule.id(), today.plusDays(1), new Confirm(new BigDecimal("100"), today.plusDays(1)));
        assertThat(ledger.getAccountBalance(user.getId(), account.getId())).isEqualByComparingTo("100");
    }
    @Test void pauseResumeDoesNotRecreateMissedMonths() {
        var rule = service.create(user.getId(), request(RecurrenceKind.INCOME, RecurrenceMode.AUTOMATIC, today.plusDays(1)));
        var paused = service.setActive(user.getId(), rule.id(), new SetActive(false, rule.version()));
        clock.now = Instant.parse("2027-01-20T15:00:00Z");
        var resumed = service.setActive(user.getId(), rule.id(), new SetActive(true, paused.version()));
        worker.process(rule.id());
        assertThat(resumed.nextDate()).isEqualTo("2027-01-21");
        assertThat(ledger.getAccountBalance(user.getId(), account.getId())).isZero();
    }
    @Test void reversedEntryIsNotRegenerated() {
        var rule = service.create(user.getId(), request(RecurrenceKind.INCOME, RecurrenceMode.AUTOMATIC, today));
        var entry = service.agenda(user.getId(), 2026, 10).entries().getFirst();
        ledger.reverseTransaction(entry.transactionId(), user.getId());
        worker.process(rule.id());
        assertThat(service.agenda(user.getId(), 2026, 10).entries().getFirst().status()).isEqualTo("REVERSED");
        assertThat(ledger.getAccountBalance(user.getId(), account.getId())).isZero();
    }
    @Test void concurrentSchedulerAndConfirmationDoNotDuplicateMoney() throws Exception {
        var rule = service.create(user.getId(), request(RecurrenceKind.INCOME, RecurrenceMode.CONFIRM, today));
        try (var pool = Executors.newFixedThreadPool(4)) {
            var futures = java.util.stream.IntStream.range(0, 8).mapToObj(i -> pool.submit(() ->
                    service.confirm(user.getId(), rule.id(), today, new Confirm(new BigDecimal("100"), today)))).toList();
            for (var future : futures) future.get(10, TimeUnit.SECONDS);
        }
        assertThat(ledger.getAccountBalance(user.getId(), account.getId())).isEqualByComparingTo("100");
    }
    @Test void futureConfirmationAndForeignOwnershipAndStaleVersionAreRejected() {
        var rule = service.create(user.getId(), request(RecurrenceKind.INCOME, RecurrenceMode.CONFIRM, today.plusDays(1)));
        assertThatThrownBy(() -> service.confirm(user.getId(), rule.id(), today.plusDays(1), new Confirm(BigDecimal.ONE, today.plusDays(1))))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.setActive(-1L, rule.id(), new SetActive(false, rule.version())))
                .isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.setActive(user.getId(), rule.id(), new SetActive(false, 999L)))
                .isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> service.create(user.getId(), request(RecurrenceKind.INCOME, RecurrenceMode.CONFIRM, today.minusDays(1))))
                .isInstanceOf(BadRequestException.class);
    }
    @Test void catchingUpRespectsTheEndDateAndOriginalReportingMonths() {
        var base = request(RecurrenceKind.INCOME, RecurrenceMode.AUTOMATIC, today.plusDays(1));
        var request = new SaveRule(base.name(), base.kind(), base.frequency(), base.mode(), base.amount(),
                base.accountId(), null, base.timeZone(), base.startDate(), LocalDate.of(2026, 11, 21),
                21, null, base.requestKey(), null);
        var rule = service.create(user.getId(), request);
        clock.now = Instant.parse("2027-02-01T15:00:00Z");
        worker.process(rule.id()); worker.process(rule.id());
        assertThat(ledger.getAccountBalance(user.getId(), account.getId())).isEqualByComparingTo("200");
        assertThat(incomes.totalByPeriod(user.getId(), today, today.withDayOfMonth(31))).isEqualByComparingTo("100");
        assertThat(incomes.totalByPeriod(user.getId(), LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 30))).isEqualByComparingTo("100");
        assertThat(service.list(user.getId()).getFirst().active()).isFalse();
        assertThat(service.agenda(user.getId(), 2027, 2).entries()).isEmpty();
    }
    @Test void editingOnlyChangesFutureOccurrencesAndKeepsPendingSnapshots() {
        var rule = service.create(user.getId(), request(RecurrenceKind.EXPENSE, RecurrenceMode.CONFIRM, today));
        var updated = service.update(user.getId(), rule.id(), new SaveRule("Nuevo importe", rule.kind(), rule.frequency(),
                rule.mode(), new BigDecimal("150"), rule.accountId(), rule.categoryId(), rule.timeZone(),
                today.plusMonths(1), null, 20, null, rule.requestKey(), rule.version()));
        var original = service.agenda(user.getId(), 2026, 10).entries().getFirst();
        assertThat(original.amount()).isEqualByComparingTo("100");
        assertThat(original.name()).isEqualTo(rule.name());
        assertThat(service.agenda(user.getId(), 2026, 11).entries()).anySatisfy(e -> {
            assertThat(e.status()).isEqualTo("PLANNED");
            assertThat(e.amount()).isEqualByComparingTo("150");
        });
        assertThat(updated.nextDate()).isEqualTo(today.plusMonths(1));
        assertThat(ledger.getAccountBalance(user.getId(), account.getId())).isZero();
    }
    @Test void pendingAlertDisappearsWhenResolvedAndIsNotAddedToHistoricalReports() {
        var rule = service.create(user.getId(), request(RecurrenceKind.EXPENSE, RecurrenceMode.CONFIRM, today));
        assertThat(alerts.buildAlerts(user.getId(), 2026, 10, true)).anySatisfy(a -> {
            assertThat(a.getCode()).isEqualTo("RECURRING_PENDING");
            assertThat(a.getData().get("count")).isEqualTo(1L);
        });
        assertThat(alerts.buildAlerts(user.getId(), 2026, 10, false)).noneMatch(a -> a.getCode().equals("RECURRING_PENDING"));
        service.skip(user.getId(), rule.id(), today);
        assertThat(alerts.buildAlerts(user.getId(), 2026, 10, true)).noneMatch(a -> a.getCode().equals("RECURRING_PENDING"));
    }
    @Test void authenticatedApiAndOpenApiAreAvailable() throws Exception {
        mvc.perform(get("/api/v1/recurrences")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/recurrences").header("Authorization", "Bearer " + jwt.generateToken(user.getEmail())))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isArray());
        var json = mvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
                .andExpect(jsonPath("$.components.schemas.SaveRecurringRuleRequest").exists())
                .andExpect(jsonPath("$.paths['/api/v1/recurrences/agenda']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/reports/expenses']").exists())
                .andExpect(jsonPath("$.components.schemas.RecurringUpcomingResponse").exists())
                .andReturn().getResponse().getContentAsString();
        Files.createDirectories(Path.of("target"));
        Files.writeString(Path.of("target/recurrence-openapi.json"), json);
    }

    @Test void pausedAndFinishedHaveDifferentStatesAndEditingKeepsPause() {
        var base = request(RecurrenceKind.INCOME, RecurrenceMode.CONFIRM, today.plusDays(1));
        var rule = service.create(user.getId(), new SaveRule(base.name(), base.kind(), base.frequency(), base.mode(),
                base.amount(), base.accountId(), null, base.timeZone(), base.startDate(), today.plusDays(1),
                21, null, base.requestKey(), null));
        var paused = service.setActive(user.getId(), rule.id(), new SetActive(false, rule.version()));
        assertThat(paused.state()).isEqualTo("PAUSED");
        clock.now = Instant.parse("2026-10-22T15:00:00Z");
        var finished = service.list(user.getId()).getFirst();
        assertThat(finished.state()).isEqualTo("FINISHED");
        assertThatThrownBy(() -> service.setActive(user.getId(), rule.id(), new SetActive(true, finished.version())))
                .isInstanceOf(BadRequestException.class);
        var edited = service.update(user.getId(), rule.id(), new SaveRule(base.name(), base.kind(), base.frequency(), base.mode(),
                base.amount(), base.accountId(), null, base.timeZone(), today.plusDays(2), null,
                21, null, base.requestKey(), finished.version()));
        assertThat(edited.state()).isEqualTo("PAUSED");
        assertThat(service.setActive(user.getId(), rule.id(), new SetActive(true, edited.version())).state()).isEqualTo("ACTIVE");
    }

    @Test void upcomingCrossesTheMonthAndLimitsRowsWithoutChangingMoney() {
        service.create(user.getId(), request(RecurrenceKind.INCOME, RecurrenceMode.CONFIRM, today));
        clock.now = Instant.parse("2026-10-30T15:00:00Z");
        for (int day = 0; day < 8; day++) service.create(user.getId(), request(RecurrenceKind.INCOME,
                RecurrenceMode.CONFIRM, LocalDate.of(2026,10,30).plusDays(day)));
        var result = service.upcoming(user.getId(), "America/Bogota");
        assertThat(result.from()).isEqualTo(LocalDate.of(2026,10,30));
        assertThat(result.to()).isEqualTo(LocalDate.of(2026,11,5));
        assertThat(result.total()).isEqualTo(7);
        assertThat(result.entries()).hasSize(3).extracting(Entry::dueDate)
                .containsExactly(LocalDate.of(2026,10,30), LocalDate.of(2026,10,31), LocalDate.of(2026,11,1));
        assertThat(service.upcoming(user.getId() + 100000, "America/Bogota").entries()).isEmpty();
        assertThat(ledger.getAccountBalance(user.getId(), account.getId())).isZero();
    }

    @Test void reportHistoryFiltersBeforePaginationAndIncludesExpenseReversals() throws Exception {
        LocalDate date = LocalDate.now();
        ledger.recordOpeningBalance(user.getId(), account.getId(), new FinancialOperationCommand(new BigDecimal("10000"),date,"Inicio",null,null));
        Long first = null;
        for (int i=0;i<25;i++) {
            var transaction = ledger.recordExpense(user.getId(), account.getId(), new FinancialOperationCommand(new BigDecimal("10"),date,"Factura",null,category.getId()));
            if (first == null) first = transaction.getId();
        }
        var reversal = ledger.reverseTransaction(first, user.getId());
        var usd = new Account(); usd.setUser(user); usd.setName("USD"); usd.setType(AccountType.BANK); usd.setCurrency("USD"); usd.setActive(true);
        usd = accounts.saveAndFlush(usd);
        ledger.recordOpeningBalance(user.getId(), usd.getId(), new FinancialOperationCommand(new BigDecimal("1000"),date,"Inicio",null,null));
        ledger.recordExpense(user.getId(), usd.getId(), new FinancialOperationCommand(new BigDecimal("77"),date,"Factura USD",null,category.getId()));
        var query = new com.jr.finance.api.transaction.TransactionQuery(null,null,date.getYear(),date.getMonthValue(),null,null,null,null,0,5,"COP",true,category.getName());
        var firstPage = transactionHistory.find(user.getId(), query);
        assertThat(firstPage.totalElements()).isEqualTo(26);
        assertThat(firstPage.content()).hasSize(5).allSatisfy(item -> assertThat(item.currency()).isEqualTo("COP"));
        assertThat(firstPage.content()).anySatisfy(item -> assertThat(item.id()).isEqualTo(reversal.getId()));
        var all = transactionHistory.find(user.getId(), new com.jr.finance.api.transaction.TransactionQuery(null,null,date.getYear(),date.getMonthValue(),null,null,null,null,0,100,"COP",true,category.getName()));
        var net = all.content().stream().map(item -> item.type().equals("REVERSAL") ? item.amount().negate() : item.amount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(net).isEqualByComparingTo(reports.month(user.getId(),date.getYear(),date.getMonthValue()).get("COP").expensesByCategory().get(category.getName()));
        assertThat(net).isEqualByComparingTo("240");
        Long owned = first;
        assertThat(transactionHistory.detail(user.getId(), owned).id()).isEqualTo(owned);
        assertThatThrownBy(() -> transactionHistory.detail(user.getId()+100000, owned)).isInstanceOf(NotFoundException.class);
        assertThat(transactionHistory.find(user.getId()+100000, query).content()).isEmpty();
        mvc.perform(get("/api/v1/reports/expenses").param("year",String.valueOf(date.getYear())).param("month",String.valueOf(date.getMonthValue()))
                .param("currency","COP").param("category",category.getName()).param("page","1").param("size","5")
                .header("Authorization","Bearer " + jwt.generateToken(user.getEmail())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(26)).andExpect(jsonPath("$.content.length()").value(5));
        mvc.perform(get("/api/v1/transactions/" + owned)).andExpect(status().isUnauthorized());
    }
}
