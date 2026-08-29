package com.jr.finance.api;

import com.jr.finance.api.account.Account;
import com.jr.finance.api.account.AccountRepository;
import com.jr.finance.api.account.AccountType;
import com.jr.finance.api.auth.JwtService;
import com.jr.finance.api.alerts.AlertService;
import com.jr.finance.api.alerts.UserAlertSeenRepository;
import com.jr.finance.api.budget.BudgetRepository;
import com.jr.finance.api.budget.BudgetService;
import com.jr.finance.api.credit.Credit;
import com.jr.finance.api.credit.CreditRepository;
import com.jr.finance.api.expense.Category;
import com.jr.finance.api.expense.CategoryRepository;
import com.jr.finance.api.ledger.FinancialOperationCommand;
import com.jr.finance.api.ledger.FinancialTransactionRepository;
import com.jr.finance.api.ledger.LedgerEntryRepository;
import com.jr.finance.api.ledger.LedgerService;
import com.jr.finance.api.transfer.TransferService;
import com.jr.finance.api.transfer.dto.CreateTransferRequest;
import com.jr.finance.api.user.Role;
import com.jr.finance.api.user.RoleRepository;
import com.jr.finance.api.user.User;
import com.jr.finance.api.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BudgetIntegrationTests {

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private AccountRepository accountRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private BudgetRepository budgetRepository;
    @Autowired private LedgerEntryRepository ledgerEntryRepository;
    @Autowired private FinancialTransactionRepository financialTransactionRepository;
    @Autowired private LedgerService ledgerService;
    @Autowired private TransferService transferService;
    @Autowired private AlertService alertService;
    @Autowired private BudgetService budgetService;
    @Autowired private UserAlertSeenRepository userAlertSeenRepository;
    @Autowired private CreditRepository creditRepository;

    @BeforeEach
    void cleanDatabase() {
        userAlertSeenRepository.deleteAll();
        ledgerEntryRepository.deleteAll();
        financialTransactionRepository.deleteAll();
        creditRepository.deleteAll();
        budgetRepository.deleteAll();
        categoryRepository.deleteAll();
        accountRepository.deleteAll();
        userRepository.deleteAll();
        roleRepository.deleteAll();
    }

    @Test
    void createsOwnBudgetAndRejectsDuplicatesInvalidPeriodsAndForeignCategories() throws Exception {
        User owner = createUser();
        User other = createUser();
        Category food = category(owner, "Food");
        Category foreign = category(other, "Foreign");
        String body = """
                {"categoryId":%d,"year":2026,"month":8,"limitAmount":500000}
                """.formatted(food.getId());

        mockMvc.perform(post("/api/v1/budgets").header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.categoryId").value(food.getId()))
                .andExpect(jsonPath("$.period").value("2026-08"))
                .andExpect(jsonPath("$.limitAmount").value(500000))
                .andExpect(jsonPath("$.version").value(0));
        mockMvc.perform(post("/api/v1/budgets").header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict());
        mockMvc.perform(post("/api/v1/budgets").header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"categoryId\":%d,\"year\":2026,\"month\":8,\"limitAmount\":0}".formatted(food.getId())))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/v1/budgets").header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"categoryId\":%d,\"year\":2026,\"month\":13,\"limitAmount\":1}".formatted(food.getId())))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/v1/budgets").header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"categoryId\":%d,\"year\":2026,\"month\":8,\"limitAmount\":1}".formatted(foreign.getId())))
                .andExpect(status().isNotFound());
    }

    @Test
    void derivesSpentOnlyFromCategorizedExpenseLedgerEntriesAndReversals() throws Exception {
        User user = createUser();
        Category food = category(user, "Food");
        Category transport = category(user, "Transport");
        Account source = account(user, "Source");
        Account destination = account(user, "Destination");
        ledgerService.recordOpeningBalance(user.getId(), source.getId(), command("1000000", LocalDate.of(2026, 8, 1), null));
        ledgerService.recordExpense(user.getId(), source.getId(), command("100000", LocalDate.of(2026, 8, 2), food.getId()));
        ledgerService.recordExpense(user.getId(), source.getId(), command("50000", LocalDate.of(2026, 8, 3), food.getId()));
        var reversible = ledgerService.recordExpense(user.getId(), source.getId(), command("25000", LocalDate.of(2026, 8, 4), food.getId()));
        ledgerService.recordExpense(user.getId(), source.getId(), command("90000", LocalDate.of(2026, 8, 5), transport.getId()));
        ledgerService.recordExpense(user.getId(), source.getId(), command("70000", LocalDate.of(2026, 7, 31), food.getId()));
        transferService.create(user.getId(), transfer(source.getId(), destination.getId(), "80000"));
        Long budgetId = createBudget(user, food, "200000");

        mockMvc.perform(get("/api/v1/budgets/{id}", budgetId).header("Authorization", bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.spentAmount").value(175000))
                .andExpect(jsonPath("$.remainingAmount").value(25000))
                .andExpect(jsonPath("$.percentageUsed").value(87.5))
                .andExpect(jsonPath("$.status").value("WARNING"));

        ledgerService.reverseTransaction(reversible.getId(), user.getId());
        mockMvc.perform(get("/api/v1/budgets?year=2026&month=8").header("Authorization", bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].spentAmount").value(150000))
                .andExpect(jsonPath("$[0].remainingAmount").value(50000))
                .andExpect(jsonPath("$[0].percentageUsed").value(75))
                .andExpect(jsonPath("$[0].status").value("OK"));
    }

    @Test
    void updatesOnlyLimitWithVersionAndHidesForeignBudgets() throws Exception {
        User owner = createUser();
        User other = createUser();
        Long id = createBudget(owner, category(owner, "Food"), "500000");
        Long foreignId = createBudget(other, category(other, "Other"), "1");

        mockMvc.perform(patch("/api/v1/budgets/{id}", id).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"limitAmount\":700000,\"version\":0}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.limitAmount").value(700000))
                .andExpect(jsonPath("$.version").value(1));
        mockMvc.perform(patch("/api/v1/budgets/{id}", id).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"limitAmount\":1,\"version\":0}"))
                .andExpect(status().isConflict());
        mockMvc.perform(get("/api/v1/budgets/{id}", foreignId).header("Authorization", bearer(owner)))
                .andExpect(status().isNotFound());
        mockMvc.perform(patch("/api/v1/budgets/{id}", foreignId).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"limitAmount\":1,\"version\":0}"))
                .andExpect(status().isNotFound());
        assertThat(budgetRepository.count()).isEqualTo(2);
    }

    @Test
    void budgetAlertsUseRequestedPeriodThresholdsAndLedgerReversals() throws Exception {
        User user = createUser();
        Category food = category(user, "Food");
        Account account = account(user, "Alerts");
        ledgerService.recordOpeningBalance(user.getId(), account.getId(), command("2000000", LocalDate.of(2026, 8, 1), null));
        Long budgetId = createBudget(user, food, "500000");
        var warningExpense = ledgerService.recordExpense(user.getId(), account.getId(), command("400000", LocalDate.of(2026, 8, 2), food.getId()));
        assertThat(alertService.buildAlerts(user.getId(), 2026, 8, false))
                .extracting(alert -> alert.getCode()).contains("BUDGET_WARNING").doesNotContain("ALL_GOOD");
        ledgerService.recordExpense(user.getId(), account.getId(), command("100000", LocalDate.of(2026, 8, 3), food.getId()));
        assertThat(alertService.buildAlerts(user.getId(), 2026, 8, false))
                .extracting(alert -> alert.getCode()).contains("BUDGET_WARNING");
        ledgerService.recordExpense(user.getId(), account.getId(), command("100000", LocalDate.of(2026, 8, 4), food.getId()));
        assertThat(alertService.buildAlerts(user.getId(), 2026, 8, false))
                .extracting(alert -> alert.getCode()).contains("BUDGET_EXCEEDED");
        ledgerService.reverseTransaction(warningExpense.getId(), user.getId());
        assertThat(alertService.buildAlerts(user.getId(), 2026, 8, false))
                .extracting(alert -> alert.getCode()).contains("ALL_GOOD")
                .doesNotContain("BUDGET_WARNING", "BUDGET_EXCEEDED");
        createBudget(user, food, "500000", 2026, 7);
        ledgerService.recordExpense(user.getId(), account.getId(), command("500000", LocalDate.of(2026, 7, 2), food.getId()));
        assertThat(budgetService.list(user.getId(), 2026, 7)).singleElement()
                .satisfies(budget -> assertThat(budget.getSpentAmount()).isEqualByComparingTo("500000"));
        assertThat(alertService.buildAlerts(user.getId(), 2026, 7, false))
                .extracting(alert -> alert.getCode()).contains("BUDGET_WARNING");
        assertThat(budgetId).isNotNull();
    }

    @Test
    void budgetAlertsDoNotAppearBelowEightyPercent() throws Exception {
        User user = createUser();
        Category food = category(user, "Food");
        Account account = account(user, "Below threshold");
        ledgerService.recordOpeningBalance(user.getId(), account.getId(),
                command("500000", LocalDate.of(2026, 8, 1), null));
        createBudget(user, food, "500000");
        ledgerService.recordExpense(user.getId(), account.getId(),
                command("395000", LocalDate.of(2026, 8, 2), food.getId()));

        assertThat(alertService.buildAlerts(user.getId(), 2026, 8, false))
                .extracting(alert -> alert.getCode()).contains("ALL_GOOD")
                .doesNotContain("BUDGET_WARNING", "BUDGET_EXCEEDED");
    }

    @Test
    void marksOnlyExistingOwnedBudgetAlertsAsSeen() throws Exception {
        User owner = createUser();
        User other = createUser();
        Account ownerAccount = account(owner, "Owner alerts");
        Account otherAccount = account(other, "Other alerts");
        Category food = category(owner, "Food");
        Category transport = category(owner, "Transport");
        Category foreignFood = category(other, "Foreign food");
        ledgerService.recordOpeningBalance(owner.getId(), ownerAccount.getId(),
                command("3000000", LocalDate.of(2026, 8, 1), null));
        ledgerService.recordOpeningBalance(other.getId(), otherAccount.getId(),
                command("1000000", LocalDate.of(2026, 8, 1), null));

        Long augustFood = createBudget(owner, food, "500000");
        Long augustTransport = createBudget(owner, transport, "500000");
        Long julyFood = createBudget(owner, food, "500000", 2026, 7);
        Long foreignBudget = createBudget(other, foreignFood, "500000");
        ledgerService.recordExpense(owner.getId(), ownerAccount.getId(),
                command("400000", LocalDate.of(2026, 8, 2), food.getId()));
        ledgerService.recordExpense(owner.getId(), ownerAccount.getId(),
                command("400000", LocalDate.of(2026, 8, 3), transport.getId()));
        ledgerService.recordExpense(owner.getId(), ownerAccount.getId(),
                command("400000", LocalDate.of(2026, 7, 2), food.getId()));
        ledgerService.recordExpense(other.getId(), otherAccount.getId(),
                command("400000", LocalDate.of(2026, 8, 2), foreignFood.getId()));

        markSeen(owner, "BUDGET_WARNING", augustFood).andExpect(status().isNoContent());
        assertThat(userAlertSeenRepository.count()).isEqualTo(1);
        assertThat(alertService.buildAlerts(owner.getId()).stream()
                .filter(alert -> "BUDGET_WARNING".equals(alert.getCode()))
                .map(alert -> ((Number) alert.getData().get("budgetId")).longValue()))
                .contains(augustTransport).doesNotContain(augustFood);

        markSeen(owner, "BUDGET_WARNING", augustFood).andExpect(status().isNoContent());
        assertThat(userAlertSeenRepository.count()).isEqualTo(1);

        long countBeforeInvalidRequests = userAlertSeenRepository.count();
        markSeen(owner, "FAKE_ALERT", augustFood).andExpect(status().isNotFound());
        markSeen(owner, "BUDGET_EXCEEDED", augustFood).andExpect(status().isNotFound());
        markSeen(owner, "BUDGET_WARNING", 999999L).andExpect(status().isNotFound());
        markSeen(owner, "BUDGET_WARNING", foreignBudget).andExpect(status().isNotFound());
        markSeen(owner, "ALL_GOOD", null).andExpect(status().isNotFound());
        assertThat(userAlertSeenRepository.count()).isEqualTo(countBeforeInvalidRequests);

        markSeen(owner, "BUDGET_WARNING", julyFood).andExpect(status().isNoContent());
        assertThat(userAlertSeenRepository.count()).isEqualTo(2);
        assertThat(alertService.buildAlerts(owner.getId()).stream()
                .filter(alert -> "BUDGET_WARNING".equals(alert.getCode()))
                .map(alert -> ((Number) alert.getData().get("budgetId")).longValue()))
                .contains(augustTransport);

        ledgerService.recordExpense(owner.getId(), ownerAccount.getId(),
                command("200000", LocalDate.of(2026, 8, 4), food.getId()));
        assertThat(budgetService.list(owner.getId(), 2026, 8)).filteredOn(budget -> budget.getId().equals(augustFood))
                .singleElement().satisfies(budget -> assertThat(budget.getStatus().name()).isEqualTo("EXCEEDED"));
        assertThat(alertService.buildAlerts(owner.getId()).stream()
                .filter(alert -> "BUDGET_EXCEEDED".equals(alert.getCode()))
                .map(alert -> ((Number) alert.getData().get("budgetId")).longValue()))
                .contains(augustFood);
    }

    @Test
    void dashboardExposesOnlyOwnedBasicCreditsWithoutChangingFinancialMetrics() throws Exception {
        User owner = createUser();
        User other = createUser();

        mockMvc.perform(get("/api/v1/dashboard/month?year=2026&month=8").header("Authorization", bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credits.length()").value(0))
                .andExpect(jsonPath("$.totalIncome").value(0))
                .andExpect(jsonPath("$.totalExpense").value(0))
                .andExpect(jsonPath("$.netCashFlow").value(0))
                .andExpect(jsonPath("$.netWorthByCurrency").isEmpty());

        Credit first = credit(owner, "Vehicle", "30000000", "18.50", 60, LocalDate.of(2026, 8, 15), 15);
        Credit second = credit(owner, "Education", "8000000", "12.25", 24, LocalDate.of(2026, 8, 20), 20);
        credit(other, "Foreign", "1000000", "9.50", 12, LocalDate.of(2026, 8, 1), 5);

        mockMvc.perform(get("/api/v1/dashboard/month?year=2026&month=8").header("Authorization", bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credits.length()").value(2))
                .andExpect(jsonPath("$.credits[0].id").value(first.getId()))
                .andExpect(jsonPath("$.credits[0].name").value("Vehicle"))
                .andExpect(jsonPath("$.credits[0].principal").value(30000000))
                .andExpect(jsonPath("$.credits[0].annualRate").value(18.50))
                .andExpect(jsonPath("$.credits[0].termMonths").value(60))
                .andExpect(jsonPath("$.credits[0].disbursementDate").value("2026-08-15"))
                .andExpect(jsonPath("$.credits[0].paymentDay").value(15))
                .andExpect(jsonPath("$.credits[1].id").value(second.getId()))
                .andExpect(jsonPath("$.totalIncome").value(0))
                .andExpect(jsonPath("$.totalExpense").value(0))
                .andExpect(jsonPath("$.netCashFlow").value(0))
                .andExpect(jsonPath("$.netWorthByCurrency").isEmpty());

        mockMvc.perform(get("/api/v1/dashboard/month?year=2026&month=8").header("Authorization", bearer(other)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credits.length()").value(1))
                .andExpect(jsonPath("$.credits[0].name").value("Foreign"));
    }

    @Test
    void dashboardShowsFiveRecentLedgerTransactionsForTheRequestedPeriodOnly() throws Exception {
        User owner = createUser();
        User other = createUser();
        Account source = account(owner, "Source");
        Account destination = account(owner, "Destination");
        Account foreignAccount = account(other, "Foreign");
        Category food = category(owner, "Food");
        ledgerService.recordOpeningBalance(owner.getId(), source.getId(),
                command("1000", LocalDate.of(2026, 7, 1), null));
        var julyIncome = ledgerService.recordIncome(owner.getId(), source.getId(),
                command("100", LocalDate.of(2026, 7, 2), null));
        ledgerService.recordOpeningBalance(other.getId(), foreignAccount.getId(),
                command("500", LocalDate.of(2026, 8, 1), null));
        ledgerService.recordIncome(other.getId(), foreignAccount.getId(),
                command("50", LocalDate.of(2026, 8, 10), null));

        ledgerService.recordIncome(owner.getId(), source.getId(), command("300", LocalDate.of(2026, 8, 6), null));
        ledgerService.recordExpense(owner.getId(), source.getId(), command("50", LocalDate.of(2026, 8, 3), food.getId()));
        CreateTransferRequest request = transfer(source.getId(), destination.getId(), "200");
        request.setEffectiveDate(LocalDate.of(2026, 8, 4));
        transferService.create(owner.getId(), request);
        ledgerService.recordOpeningBalance(owner.getId(), destination.getId(),
                command("10", LocalDate.of(2026, 8, 5), null));
        ledgerService.reverseTransaction(julyIncome.getId(), owner.getId());

        mockMvc.perform(get("/api/v1/dashboard/month?year=2026&month=8").header("Authorization", bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recentTransactions.length()").value(5))
                .andExpect(jsonPath("$.recentTransactions[0].type").value("REVERSAL"))
                .andExpect(jsonPath("$.recentTransactions[0].reversalOfId").value(julyIncome.getId()))
                .andExpect(jsonPath("$.recentTransactions[0].amount").value(100))
                .andExpect(jsonPath("$.recentTransactions[1].type").value("INCOME"))
                .andExpect(jsonPath("$.recentTransactions[1].amount").value(300))
                .andExpect(jsonPath("$.recentTransactions[1].accountId").value(source.getId()))
                .andExpect(jsonPath("$.recentTransactions[1].effectiveDate").value("2026-08-06"))
                .andExpect(jsonPath("$.recentTransactions[2].type").value("OPENING_BALANCE"))
                .andExpect(jsonPath("$.recentTransactions[2].amount").value(10))
                .andExpect(jsonPath("$.recentTransactions[3].type").value("TRANSFER"))
                .andExpect(jsonPath("$.recentTransactions[3].amount").value(200))
                .andExpect(jsonPath("$.recentTransactions[3].sourceAccountId").value(source.getId()))
                .andExpect(jsonPath("$.recentTransactions[3].destinationAccountId").value(destination.getId()))
                .andExpect(jsonPath("$.recentTransactions[3].currency").value("COP"))
                .andExpect(jsonPath("$.recentTransactions[4].type").value("EXPENSE"))
                .andExpect(jsonPath("$.recentTransactions[4].amount").value(50))
                .andExpect(jsonPath("$.recentTransactions[4].categoryId").value(food.getId()))
                .andExpect(jsonPath("$.recentTransactions[4].accountId").value(source.getId()));

        mockMvc.perform(get("/api/v1/dashboard/month?year=2026&month=7").header("Authorization", bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recentTransactions.length()").value(2))
                .andExpect(jsonPath("$.recentTransactions[0].type").value("INCOME"))
                .andExpect(jsonPath("$.recentTransactions[1].type").value("OPENING_BALANCE"));
        mockMvc.perform(get("/api/v1/dashboard/month?year=2026&month=8").header("Authorization", bearer(other)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recentTransactions.length()").value(2))
                .andExpect(jsonPath("$.recentTransactions[0].accountId").value(foreignAccount.getId()));
    }

    @Test
    void aggregatesBudgetSpendingByCategoryWithoutIncludingUnbudgetedExpenses() throws Exception {
        User owner = createUser();
        User other = createUser();
        Account account = account(owner, "Budget aggregation");
        Account otherAccount = account(other, "Other aggregation");
        Category food = category(owner, "Food");
        Category transport = category(owner, "Transport");
        Category health = category(owner, "Health");
        Category leisure = category(owner, "Leisure");
        Category foreignCategory = category(other, "Foreign");
        ledgerService.recordOpeningBalance(owner.getId(), account.getId(),
                command("2000000", LocalDate.of(2026, 8, 1), null));
        ledgerService.recordOpeningBalance(other.getId(), otherAccount.getId(),
                command("500000", LocalDate.of(2026, 8, 1), null));
        createBudget(owner, food, "500000");
        createBudget(owner, transport, "300000");
        createBudget(owner, health, "100000");
        createBudget(other, foreignCategory, "100000");
        var foodExpense = ledgerService.recordExpense(owner.getId(), account.getId(),
                command("200000", LocalDate.of(2026, 8, 2), food.getId()));
        ledgerService.recordExpense(owner.getId(), account.getId(),
                command("300000", LocalDate.of(2026, 8, 3), transport.getId()));
        ledgerService.recordExpense(owner.getId(), account.getId(),
                command("500000", LocalDate.of(2026, 8, 4), leisure.getId()));
        ledgerService.recordExpense(other.getId(), otherAccount.getId(),
                command("90000", LocalDate.of(2026, 8, 2), foreignCategory.getId()));

        assertBudget(budgetService.list(owner.getId(), 2026, 8), "Food", "200000", "300000", "40.00", "OK");
        assertBudget(budgetService.list(owner.getId(), 2026, 8), "Transport", "300000", "0", "100.00", "WARNING");
        assertBudget(budgetService.list(owner.getId(), 2026, 8), "Health", "0", "100000", "0.00", "OK");
        assertThat(budgetService.list(owner.getId(), 2026, 8)).hasSize(3);
        mockMvc.perform(get("/api/v1/dashboard/month?year=2026&month=8").header("Authorization", bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalExpense").value(1000000))
                .andExpect(jsonPath("$.budgets.totalBudgeted").value(900000))
                .andExpect(jsonPath("$.budgets.totalSpentOnBudgetedCategories").value(500000))
                .andExpect(jsonPath("$.budgets.totalRemaining").value(400000))
                .andExpect(jsonPath("$.budgets.overallPercentage").value(55.56))
                .andExpect(jsonPath("$.budgets.warningCount").value(1))
                .andExpect(jsonPath("$.budgets.exceededCount").value(0));

        ledgerService.reverseTransaction(foodExpense.getId(), owner.getId());
        assertBudget(budgetService.list(owner.getId(), 2026, 8), "Food", "0", "500000", "0.00", "OK");

        createBudget(owner, food, "200000", 2026, 7);
        ledgerService.recordExpense(owner.getId(), account.getId(),
                command("100000", LocalDate.of(2026, 7, 2), food.getId()));
        assertBudget(budgetService.list(owner.getId(), 2026, 7), "Food", "100000", "100000", "50.00", "OK");
        assertThat(budgetService.list(other.getId(), 2026, 8)).singleElement()
                .satisfies(budget -> assertThat(budget.getCategoryName()).isEqualTo("Foreign"));
    }

    private Long createBudget(User user, Category category, String limit) throws Exception {
        return createBudget(user, category, limit, 2026, 8);
    }
    private Long createBudget(User user, Category category, String limit, int year, int month) throws Exception {
        String response = mockMvc.perform(post("/api/v1/budgets").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"categoryId\":%d,\"year\":%d,\"month\":%d,\"limitAmount\":%s}".formatted(category.getId(), year, month, limit)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return Long.valueOf(response.replaceAll(".*\"id\":(\\d+).*", "$1"));
    }

    private FinancialOperationCommand command(String amount, LocalDate date, Long categoryId) {
        return new FinancialOperationCommand(new BigDecimal(amount), date, null, "COP", categoryId);
    }

    private Credit credit(User user, String name, String principal, String annualRate, int termMonths,
                          LocalDate disbursementDate, int paymentDay) {
        Credit credit = new Credit();
        credit.setUser(user);
        credit.setName(name);
        credit.setPrincipal(new BigDecimal(principal));
        credit.setAnnualRate(new BigDecimal(annualRate));
        credit.setTermMonths(termMonths);
        credit.setDisbursementDate(disbursementDate);
        credit.setPaymentDay(paymentDay);
        return creditRepository.saveAndFlush(credit);
    }

    private void assertBudget(java.util.List<com.jr.finance.api.budget.dto.BudgetResponse> budgets, String category,
                              String spent, String remaining, String percentage, String status) {
        assertThat(budgets).filteredOn(budget -> budget.getCategoryName().equals(category)).singleElement()
                .satisfies(budget -> {
                    assertThat(budget.getSpentAmount()).isEqualByComparingTo(spent);
                    assertThat(budget.getRemainingAmount()).isEqualByComparingTo(remaining);
                    assertThat(budget.getPercentageUsed()).isEqualByComparingTo(percentage);
                    assertThat(budget.getStatus().name()).isEqualTo(status);
                });
    }

    private org.springframework.test.web.servlet.ResultActions markSeen(User user, String code, Long relatedId)
            throws Exception {
        String content = relatedId == null ? "{}" : "{\"relatedId\":%d}".formatted(relatedId);
        return mockMvc.perform(post("/api/v1/alerts/{code}/seen", code).header("Authorization", bearer(user))
                .contentType(MediaType.APPLICATION_JSON).content(content));
    }

    private CreateTransferRequest transfer(Long source, Long destination, String amount) {
        CreateTransferRequest request = new CreateTransferRequest();
        request.setSourceAccountId(source); request.setDestinationAccountId(destination);
        request.setAmount(new BigDecimal(amount)); request.setEffectiveDate(LocalDate.of(2026, 8, 10));
        return request;
    }

    private Category category(User user, String name) {
        Category category = new Category(); category.setUser(user); category.setName(name);
        return categoryRepository.saveAndFlush(category);
    }

    private Account account(User user, String name) {
        Account account = new Account(); account.setUser(user); account.setName(name);
        account.setType(AccountType.BANK); account.setCurrency("COP"); account.setActive(true);
        return accountRepository.saveAndFlush(account);
    }

    private User createUser() {
        Role role = roleRepository.findByName("USER").orElseGet(() -> {
            Role created = new Role(); created.setName("USER"); return roleRepository.save(created);
        });
        User user = new User(); user.setName("Budget test");
        user.setEmail("budget-" + UUID.randomUUID() + "@test.local");
        user.setPassword(passwordEncoder.encode("password123")); user.getRoles().add(role);
        return userRepository.saveAndFlush(user);
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user.getEmail());
    }
}
