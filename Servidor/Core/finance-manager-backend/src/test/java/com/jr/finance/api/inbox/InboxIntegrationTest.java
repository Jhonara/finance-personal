package com.jr.finance.api.inbox;

import com.jr.finance.api.account.*;
import com.jr.finance.api.auth.JwtService;
import com.jr.finance.api.common.exception.*;
import com.jr.finance.api.expense.*;
import com.jr.finance.api.ledger.*;
import com.jr.finance.api.recurrence.*;
import com.jr.finance.api.reports.ReportService;
import com.jr.finance.api.user.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.nio.file.*;
import static com.jr.finance.api.inbox.InboxDtos.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:inbox;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc @ActiveProfiles("test")
class InboxIntegrationTest {
    @Autowired InboxService inbox;
    @Autowired PurchaseDraftRepository drafts;
    @Autowired UserRepository users;
    @Autowired RoleRepository roles;
    @Autowired AccountRepository accounts;
    @Autowired CategoryRepository categories;
    @Autowired LedgerService ledger;
    @Autowired ReportService reports;
    @Autowired RecurringRuleRepository rules;
    @Autowired RecurringOccurrenceRepository occurrences;
    @Autowired MockMvc mvc;
    @Autowired JwtService jwt;
    User owner; Account account; Category category;
    final LocalDate date = LocalDate.of(2026, 10, 20);

    @BeforeEach void setup() {
        owner = user(); account = account(owner, "COP");
        category = new Category(); category.setName("Comida"); category.setUser(owner); category = categories.saveAndFlush(category);
        ledger.recordOpeningBalance(owner.getId(), account.getId(), new FinancialOperationCommand(new BigDecimal("1000"), date, null, "COP", null));
    }
    @Test void draftDoesNotChangeBalancesOrReportsAndConfirmationIsIdempotent() {
        var request = create(fields("50")); var saved = inbox.create(owner.getId(), request);
        assertThat(inbox.create(owner.getId(), request).id()).isEqualTo(saved.id());
        assertThat(ledger.getAccountBalance(owner.getId(), account.getId())).isEqualByComparingTo("1000");
        assertThat(reports.month(owner.getId(), 2026, 10)).isEmpty();
        var confirm = new Confirm(saved.version(), saved.reviewToken(), false);
        var posted = inbox.confirm(owner.getId(), saved.id(), confirm);
        assertThat(inbox.confirm(owner.getId(), saved.id(), confirm).transactionId()).isEqualTo(posted.transactionId());
        assertThat(ledger.getAccountBalance(owner.getId(), account.getId())).isEqualByComparingTo("950");
        assertThat(reports.month(owner.getId(), 2026, 10).get("COP").expense()).isEqualByComparingTo("50");
        assertThat(inbox.list(owner.getId(), 0).totalElements()).isZero();
    }
    @Test void concurrentConfirmationCreatesExactlyOneExpense() throws Exception {
        var saved = inbox.create(owner.getId(), create(fields("50")));
        var request = new Confirm(saved.version(), saved.reviewToken(), false);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var gate = new CyclicBarrier(2);
            Callable<Long> task = () -> { gate.await(5, TimeUnit.SECONDS); return inbox.confirm(owner.getId(), saved.id(), request).transactionId(); };
            var first = executor.submit(task); var second = executor.submit(task);
            assertThat(first.get(10, TimeUnit.SECONDS)).isEqualTo(second.get(10, TimeUnit.SECONDS));
        }
        assertThat(ledger.getAccountBalance(owner.getId(), account.getId())).isEqualByComparingTo("950");
    }
    @Test void detectsExistingMovementAndLinksWithoutAnotherExpense() {
        var tx = expense("50", "Mercado"); var saved = inbox.create(owner.getId(), create(fields("50")));
        assertThat(saved.matches()).anySatisfy(match -> { assertThat(match.id()).isEqualTo(tx.getId()); assertThat(match.kind()).isEqualTo("TRANSACTION"); });
        assertThatThrownBy(() -> inbox.confirm(owner.getId(), saved.id(), new Confirm(saved.version(), saved.reviewToken(), false))).isInstanceOf(ConflictException.class);
        var result = inbox.link(owner.getId(), saved.id(), new Link(saved.version(), tx.getId()));
        assertThat(result.status()).isEqualTo("LINKED");
        assertThat(inbox.link(owner.getId(), saved.id(), new Link(saved.version(), tx.getId())).transactionId()).isEqualTo(tx.getId());
        assertThat(ledger.getAccountBalance(owner.getId(), account.getId())).isEqualByComparingTo("950");
    }
    @Test void requiresReviewAgainIfAnotherMovementAppearsAndAllowsAnExplicitDifferentPurchase() {
        var saved = inbox.create(owner.getId(), create(fields("50"))); expense("50", "Otra compra");
        assertThatThrownBy(() -> inbox.confirm(owner.getId(), saved.id(), new Confirm(saved.version(), saved.reviewToken(), true))).isInstanceOf(ConflictException.class);
        var refreshed = inbox.get(owner.getId(), saved.id());
        inbox.confirm(owner.getId(), saved.id(), new Confirm(refreshed.version(), refreshed.reviewToken(), true));
        assertThat(ledger.getAccountBalance(owner.getId(), account.getId())).isEqualByComparingTo("900");
    }
    @Test void isolatesOwnersCurrenciesAndAccountsAndRechecksInactiveResources() {
        var other = user(); var foreign = account(other, "COP"); var saved = inbox.create(owner.getId(), create(fields("50")));
        assertThatThrownBy(() -> inbox.get(other.getId(), saved.id())).isInstanceOf(NotFoundException.class);
        assertThat(inbox.list(other.getId(), 0).totalElements()).isZero();
        assertThatThrownBy(() -> inbox.create(owner.getId(), create(new Fields(Kind.EXPENSE, "Compra", null, "COP", null, foreign.getId(), null)))).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> inbox.update(owner.getId(), saved.id(), new Update(saved.version(), new Fields(Kind.EXPENSE, "Compra", new BigDecimal("50"), "USD", date, account.getId(), category.getId())))).isInstanceOf(BadRequestException.class);
        account.setActive(false); accounts.saveAndFlush(account);
        assertThatThrownBy(() -> inbox.confirm(owner.getId(), saved.id(), new Confirm(saved.version(), saved.reviewToken(), false))).isInstanceOf(BadRequestException.class);
    }
    @Test void incompleteOtherAndFutureDraftsCannotBecomeOrdinaryExpenses() {
        var incomplete = inbox.create(owner.getId(), create(new Fields(Kind.EXPENSE, "Compra", null, null, null, null, null)));
        assertThatThrownBy(() -> inbox.confirm(owner.getId(), incomplete.id(), new Confirm(incomplete.version(), incomplete.reviewToken(), false))).isInstanceOf(BadRequestException.class);
        var other = inbox.create(owner.getId(), create(new Fields(Kind.OTHER, "Cuota crédito", new BigDecimal("50"), "COP", date, account.getId(), category.getId())));
        assertThatThrownBy(() -> inbox.confirm(owner.getId(), other.id(), new Confirm(other.version(), other.reviewToken(), false))).isInstanceOf(BadRequestException.class);
        var future = inbox.create(owner.getId(), create(new Fields(Kind.EXPENSE, "Compra", new BigDecimal("50"), "COP", LocalDate.now().plusDays(30), account.getId(), category.getId())));
        assertThatThrownBy(() -> inbox.confirm(owner.getId(), future.id(), new Confirm(future.version(), future.reviewToken(), false))).isInstanceOf(BadRequestException.class);
    }
    @Test void draftsAndScheduledPaymentsArePossibleMatchesAndCanBeDiscarded() {
        var first = inbox.create(owner.getId(), create(fields("50")));
        var rule = new RecurringRule(); rule.setUser(owner); rule.setRequestKey(UUID.randomUUID().toString()); rule.setName("Internet");
        rule.setKind(RecurrenceKind.EXPENSE); rule.setFrequency(RecurrenceFrequency.MONTHLY); rule.setMode(RecurrenceMode.CONFIRM);
        rule.setAmount(new BigDecimal("50")); rule.setAccount(account); rule.setCurrency("COP"); rule.setTimeZone("America/Bogota");
        rule.setStartDate(date); rule.setNextDate(date); rule.setFirstDay(20); rule = rules.saveAndFlush(rule);
        var occurrence = new RecurringOccurrence(); occurrence.setRule(rule); occurrence.setName("Internet"); occurrence.setKind(RecurrenceKind.EXPENSE);
        occurrence.setDueDate(date); occurrence.setAmount(new BigDecimal("50")); occurrence.setCurrency("COP"); occurrence.setAccount(account); occurrences.saveAndFlush(occurrence);
        var second = inbox.create(owner.getId(), create(fields("50")));
        assertThat(second.matches()).extracting(Match::kind).contains("DRAFT", "SCHEDULED");
        inbox.discard(owner.getId(), first.id(), first.version());
        assertThat(inbox.list(owner.getId(), 0).totalElements()).isEqualTo(1);
        assertThat(ledger.getAccountBalance(owner.getId(), account.getId())).isEqualByComparingTo("1000");
    }
    @Test void suggestsOnlyAnUnambiguousCategoryFromOwnedHistoryAndInvalidatesStaleEdits() {
        expense("40", "Mercado");
        var saved = inbox.create(owner.getId(), create(new Fields(Kind.EXPENSE, "Mercado", new BigDecimal("50"), "COP", date, account.getId(), null)));
        assertThat(saved.categorySuggestion().id()).isEqualTo(category.getId());
        var edited = inbox.update(owner.getId(), saved.id(), new Update(saved.version(), fields("60")));
        assertThat(edited.version()).isGreaterThan(saved.version());
        assertThatThrownBy(() -> inbox.update(owner.getId(), saved.id(), new Update(saved.version(), fields("70")))).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> inbox.discard(owner.getId(), saved.id(), saved.version())).isInstanceOf(ConflictException.class);
    }
    @Test void validatesHttpAndExportsContract() throws Exception {
        mvc.perform(get("/api/v1/inbox")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/inbox").header("Authorization", bearer(owner)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"requestKey\":\"abcdefghijklmnop\",\"fields\":{\"kind\":\"EXPENSE\",\"description\":\"Compra\",\"amount\":-5}}"))
                .andExpect(status().isBadRequest());
        var saved = inbox.create(owner.getId(), create(fields("50")));
        mvc.perform(get("/api/v1/inbox/{id}", saved.id()).header("Authorization", bearer(user()))).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/inbox/{id}", saved.id()).header("Authorization", bearer(owner)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.fields.amount").value(50)).andExpect(jsonPath("$.source").value("PASTED_TEXT"));
        var schema = mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        Files.writeString(Path.of("target/inbox-openapi.json"), schema);
    }
    private Fields fields(String amount) { return new Fields(Kind.EXPENSE, "Mercado", new BigDecimal(amount), "COP", date, account.getId(), category.getId()); }
    private Create create(Fields fields) { return new Create(UUID.randomUUID().toString(), fields); }
    private FinancialTransaction expense(String amount, String description) { return ledger.recordExpense(owner.getId(), account.getId(), new FinancialOperationCommand(new BigDecimal(amount), date, description, "COP", category.getId())); }
    private Account account(User user, String currency) { var row = new Account(); row.setUser(user); row.setName("Cuenta"); row.setType(AccountType.CASH); row.setCurrency(currency); row.setActive(true); return accounts.saveAndFlush(row); }
    private User user() {
        Role role = roles.findByName("USER").orElseGet(() -> { var r = new Role(); r.setName("USER"); return roles.saveAndFlush(r); });
        var row = new User(); row.setName("Inbox test"); row.setEmail(UUID.randomUUID() + "@test.local"); row.setPassword("unused"); row.setRoles(Set.of(role)); return users.saveAndFlush(row);
    }
    private String bearer(User user) { return "Bearer " + jwt.generateToken(user.getEmail()); }
}
