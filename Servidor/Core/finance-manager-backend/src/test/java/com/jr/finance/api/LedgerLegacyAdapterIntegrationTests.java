package com.jr.finance.api;

import com.jr.finance.api.account.Account;
import com.jr.finance.api.account.AccountRepository;
import com.jr.finance.api.account.AccountType;
import com.jr.finance.api.auth.JwtService;
import com.jr.finance.api.expense.Category;
import com.jr.finance.api.expense.CategoryRepository;
import com.jr.finance.api.expense.Expense;
import com.jr.finance.api.expense.ExpenseRepository;
import com.jr.finance.api.income.Income;
import com.jr.finance.api.income.IncomeRepository;
import com.jr.finance.api.ledger.FinancialTransactionRepository;
import com.jr.finance.api.ledger.FinancialTransactionStatus;
import com.jr.finance.api.ledger.FinancialTransactionType;
import com.jr.finance.api.ledger.LedgerService;
import com.jr.finance.api.ledger.LegacyAccountMappingRepository;
import com.jr.finance.api.ledger.LegacyLedgerMigrationService;
import com.jr.finance.api.ledger.LedgerEntryRepository;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LedgerLegacyAdapterIntegrationTests {

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private AccountRepository accountRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private IncomeRepository incomeRepository;
    @Autowired private ExpenseRepository expenseRepository;
    @Autowired private LedgerEntryRepository ledgerEntryRepository;
    @Autowired private FinancialTransactionRepository financialTransactionRepository;
    @Autowired private LedgerService ledgerService;
    @Autowired private LegacyLedgerMigrationService legacyMigrationService;
    @Autowired private LegacyAccountMappingRepository legacyAccountMappingRepository;

    @BeforeEach
    void cleanDatabase() {
        ledgerEntryRepository.deleteAll();
        financialTransactionRepository.deleteAll();
        legacyAccountMappingRepository.deleteAll();
        expenseRepository.deleteAll();
        incomeRepository.deleteAll();
        categoryRepository.deleteAll();
        accountRepository.deleteAll();
        userRepository.deleteAll();
        roleRepository.deleteAll();
    }

    @Test
    void newIncomeWritesOnlyLedgerAndIsVisibleInMonthlyReadsAndBalance() throws Exception {
        User user = createUser();
        Account account = createAccount(user, true);

        mockMvc.perform(post("/api/incomes").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":100000,\"description\":\"Salary\",\"incomeType\":\"SALARY\",\"incomeDate\":\"2026-08-15\",\"accountId\":%d}".formatted(account.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(100000))
                .andExpect(jsonPath("$.incomeType").value("SALARY"));

        org.junit.jupiter.api.Assertions.assertEquals(0, incomeRepository.count());
        org.junit.jupiter.api.Assertions.assertEquals(1, financialTransactionRepository.count());
        org.junit.jupiter.api.Assertions.assertEquals(1, ledgerEntryRepository.count());
        mockMvc.perform(get("/api/incomes/month?year=2026&month=8").header("Authorization", bearer(user)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mockMvc.perform(get("/api/balance/month?year=2026&month=8").header("Authorization", bearer(user)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalIncome").value(100000));
    }

    @Test
    void newExpenseUpdatesCombinedSummaryAndBalanceWithoutLegacyRow() throws Exception {
        User user = createUser();
        Account account = createAccount(user, true);
        Category category = new Category();
        category.setName("Food");
        category.setUser(user);
        category = categoryRepository.save(category);

        mockMvc.perform(post("/api/expenses").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":30000,\"description\":\"Market\",\"paymentType\":\"CARD\",\"expenseType\":\"VARIABLE\",\"expenseDate\":\"2026-08-15\",\"categoryId\":%d,\"accountId\":%d}".formatted(category.getId(), account.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.category").value("Food"))
                .andExpect(jsonPath("$.expenseType").value("VARIABLE"));

        org.junit.jupiter.api.Assertions.assertEquals(0, expenseRepository.count());
        mockMvc.perform(get("/api/expenses/summary?year=2026&month=8").header("Authorization", bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(30000))
                .andExpect(jsonPath("$.variableTotal").value(30000));
        mockMvc.perform(get("/api/balance/month?year=2026&month=8").header("Authorization", bearer(user)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalExpense").value(30000))
                .andExpect(jsonPath("$.balance").value(-30000));
        mockMvc.perform(get("/api/dashboard/month?year=2026&month=8").header("Authorization", bearer(user)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalExpense").value(30000))
                .andExpect(jsonPath("$.balance").value(-30000));
    }

    @Test
    void legacyRowsAreIgnoredAfterLedgerCutover() throws Exception {
        User user = createUser();
        Account account = createAccount(user, true);
        Income legacyIncome = new Income();
        legacyIncome.setUser(user);
        legacyIncome.setAmount(new BigDecimal("50000"));
        legacyIncome.setIncomeType("EXTRA");
        legacyIncome.setIncomeDate(LocalDate.of(2026, 8, 10));
        incomeRepository.save(legacyIncome);

        mockMvc.perform(post("/api/incomes").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":100000,\"incomeType\":\"SALARY\",\"incomeDate\":\"2026-08-15\",\"accountId\":%d}".formatted(account.getId())))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/incomes/month?year=2026&month=8").header("Authorization", bearer(user)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mockMvc.perform(get("/api/balance/month?year=2026&month=8").header("Authorization", bearer(user)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalIncome").value(100000));
    }

    @Test
    void requiresAnActiveOwnedAccountForNewOperations() throws Exception {
        User owner = createUser();
        User other = createUser();
        Account inactive = createAccount(owner, false);
        Account foreign = createAccount(other, true);

        mockMvc.perform(post("/api/incomes").header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":1,\"incomeType\":\"EXTRA\",\"incomeDate\":\"2026-08-15\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/incomes").header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":1,\"incomeType\":\"EXTRA\",\"incomeDate\":\"2026-08-15\",\"accountId\":%d}".formatted(inactive.getId())))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/expenses").header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":1,\"paymentType\":\"CASH\",\"expenseType\":\"VARIABLE\",\"expenseDate\":\"2026-08-15\",\"accountId\":%d}".formatted(foreign.getId())))
                .andExpect(status().isNotFound());
    }

    @Test
    void deletingLedgerExpenseCreatesOneReversalAndRestoresBalance() throws Exception {
        User user = createUser();
        Account account = createAccount(user, true);
        ledgerService.recordOpeningBalance(user.getId(), account.getId(),
                new com.jr.finance.api.ledger.FinancialOperationCommand(new BigDecimal("500000"),
                        LocalDate.of(2026, 8, 1), null, "COP", null));

        mockMvc.perform(post("/api/expenses").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":100000,\"paymentType\":\"CASH\",\"expenseType\":\"VARIABLE\",\"expenseDate\":\"2026-08-15\",\"accountId\":%d}".formatted(account.getId())))
                .andExpect(status().isOk());
        Long expenseId = financialTransactionRepository.findAll().stream()
                .filter(transaction -> transaction.getType() == FinancialTransactionType.EXPENSE)
                .findFirst().orElseThrow().getId();

        mockMvc.perform(delete("/api/expenses/{id}", expenseId).header("Authorization", bearer(user)))
                .andExpect(status().isOk());

        var original = financialTransactionRepository.findById(expenseId).orElseThrow();
        var reversal = financialTransactionRepository.findAll().stream()
                .filter(transaction -> transaction.getType() == FinancialTransactionType.REVERSAL)
                .findFirst().orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals(FinancialTransactionStatus.REVERSED, original.getStatus());
        org.junit.jupiter.api.Assertions.assertEquals(FinancialTransactionStatus.POSTED, reversal.getStatus());
        org.junit.jupiter.api.Assertions.assertTrue(financialTransactionRepository.existsByReversalOfId(expenseId));
        org.junit.jupiter.api.Assertions.assertEquals(3, ledgerEntryRepository.count());
        org.junit.jupiter.api.Assertions.assertEquals(0, ledgerService.getAccountBalance(user.getId(), account.getId())
                .compareTo(new BigDecimal("500000")));

        mockMvc.perform(delete("/api/expenses/{id}", expenseId).header("Authorization", bearer(user)))
                .andExpect(status().isConflict());
        org.junit.jupiter.api.Assertions.assertEquals(3, ledgerEntryRepository.count());
    }

    @Test
    void reversalAllowsAnInactiveOriginalAccountAndHidesForeignOperations() throws Exception {
        User owner = createUser();
        User other = createUser();
        Account ownerAccount = createAccount(owner, true);
        Account otherAccount = createAccount(other, true);
        var ownerExpense = ledgerService.recordExpense(owner.getId(), ownerAccount.getId(),
                new com.jr.finance.api.ledger.FinancialOperationCommand(BigDecimal.TEN, LocalDate.now(), null, "COP", null));
        var foreignExpense = ledgerService.recordExpense(other.getId(), otherAccount.getId(),
                new com.jr.finance.api.ledger.FinancialOperationCommand(BigDecimal.TEN, LocalDate.now(), null, "COP", null));
        ownerAccount.setActive(false);
        accountRepository.saveAndFlush(ownerAccount);

        mockMvc.perform(delete("/api/expenses/{id}", ownerExpense.getId()).header("Authorization", bearer(owner)))
                .andExpect(status().isOk());
        mockMvc.perform(delete("/api/expenses/{id}", foreignExpense.getId()).header("Authorization", bearer(owner)))
                .andExpect(status().isNotFound());
    }

    @Test
    void deletingLegacyExpenseIsNoLongerAProductionOperationAfterCutover() throws Exception {
        User user = createUser();
        Expense legacy = new Expense();
        legacy.setUser(user);
        legacy.setAmount(BigDecimal.TEN);
        legacy.setExpenseDate(LocalDate.now());
        legacy = expenseRepository.saveAndFlush(legacy);

        mockMvc.perform(delete("/api/expenses/{id}", legacy.getId()).header("Authorization", bearer(user)))
                .andExpect(status().isNotFound());
        org.junit.jupiter.api.Assertions.assertTrue(expenseRepository.existsById(legacy.getId()));
        org.junit.jupiter.api.Assertions.assertEquals(0, financialTransactionRepository.count());
    }

    @Test
    void historicalMigrationIsIdempotentAndCombinedReadsDoNotDoubleCount() throws Exception {
        User user = createUser();
        Income income = new Income(); income.setUser(user); income.setAmount(new BigDecimal("100000"));
        income.setIncomeDate(LocalDate.of(2026, 8, 10)); income.setIncomeType("EXTRA"); incomeRepository.saveAndFlush(income);
        Expense expense = new Expense(); expense.setUser(user); expense.setAmount(new BigDecimal("30000"));
        expense.setExpenseDate(LocalDate.of(2026, 8, 11)); expense.setExpenseType("VARIABLE"); expenseRepository.saveAndFlush(expense);

        var first = legacyMigrationService.migrate(100);
        var second = legacyMigrationService.migrate(100);
        org.junit.jupiter.api.Assertions.assertEquals(1, first.incomesMigrated());
        org.junit.jupiter.api.Assertions.assertEquals(1, first.expensesMigrated());
        org.junit.jupiter.api.Assertions.assertEquals(0, second.incomesMigrated());
        org.junit.jupiter.api.Assertions.assertEquals(0, second.expensesMigrated());
        org.junit.jupiter.api.Assertions.assertEquals(2, financialTransactionRepository.count());
        org.junit.jupiter.api.Assertions.assertEquals(2, ledgerEntryRepository.count());
        org.junit.jupiter.api.Assertions.assertEquals(1, legacyAccountMappingRepository.count());

        mockMvc.perform(get("/api/incomes/month?year=2026&month=8").header("Authorization", bearer(user)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mockMvc.perform(get("/api/expenses/month?year=2026&month=8").header("Authorization", bearer(user)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mockMvc.perform(get("/api/balance/month?year=2026&month=8").header("Authorization", bearer(user)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalIncome").value(100000))
                .andExpect(jsonPath("$.totalExpense").value(30000));
    }

    @Test
    void transferHttpValidationRejectsZeroAndNegativeAmountsBeforePersisting() throws Exception {
        User user = createUser();
        long transactionsBefore = financialTransactionRepository.count();
        long entriesBefore = ledgerEntryRepository.count();

        for (String amount : new String[] {"0", "-1"}) {
            mockMvc.perform(post("/api/transfers").header("Authorization", bearer(user))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"sourceAccountId":1,"destinationAccountId":2,"amount":%s,"effectiveDate":"2026-08-15"}
                                    """.formatted(amount)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("BAD_REQUEST"))
                    .andExpect(jsonPath("$.status").value(400));
        }

        assertThat(financialTransactionRepository.count()).isEqualTo(transactionsBefore);
        assertThat(ledgerEntryRepository.count()).isEqualTo(entriesBefore);
    }

    @Test
    void transferDoesNotContaminateIncomeExpenseOrDashboardMetrics() throws Exception {
        User user = createUser();
        Account source = createAccount(user, true);
        Account destination = createAccount(user, true);
        Category category = new Category();
        category.setName("Transfer metrics");
        category.setUser(user);
        category = categoryRepository.saveAndFlush(category);
        ledgerService.recordOpeningBalance(user.getId(), source.getId(),
                new com.jr.finance.api.ledger.FinancialOperationCommand(new BigDecimal("500000"), LocalDate.of(2026, 8, 1), null, "COP", null));
        ledgerService.recordOpeningBalance(user.getId(), destination.getId(),
                new com.jr.finance.api.ledger.FinancialOperationCommand(new BigDecimal("100000"), LocalDate.of(2026, 8, 1), null, "COP", null));
        mockMvc.perform(post("/api/incomes").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"amount":70000,"incomeType":"EXTRA","incomeDate":"2026-08-15","accountId":%d}
                                """.formatted(source.getId())))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/expenses").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"amount":20000,"paymentType":"CASH","expenseType":"VARIABLE","expenseDate":"2026-08-15","categoryId":%d,"accountId":%d}
                                """.formatted(category.getId(), source.getId())))
                .andExpect(status().isOk());

        String incomesBefore = mockMvc.perform(get("/api/incomes/month?year=2026&month=8").header("Authorization", bearer(user))).andReturn().getResponse().getContentAsString();
        String summaryBefore = mockMvc.perform(get("/api/expenses/summary?year=2026&month=8").header("Authorization", bearer(user))).andReturn().getResponse().getContentAsString();
        String comparisonBefore = mockMvc.perform(get("/api/expenses/compare?year=2026&month=8").header("Authorization", bearer(user))).andReturn().getResponse().getContentAsString();
        String balanceBefore = mockMvc.perform(get("/api/balance/month?year=2026&month=8").header("Authorization", bearer(user))).andReturn().getResponse().getContentAsString();
        String dashboardBefore = mockMvc.perform(get("/api/dashboard/month?year=2026&month=8").header("Authorization", bearer(user))).andReturn().getResponse().getContentAsString();
        BigDecimal netWorthBefore = ledgerService.getAccountBalance(user.getId(), source.getId())
                .add(ledgerService.getAccountBalance(user.getId(), destination.getId()));

        mockMvc.perform(post("/api/transfers").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sourceAccountId":%d,"destinationAccountId":%d,"amount":200000,"effectiveDate":"2026-08-15"}
                                """.formatted(source.getId(), destination.getId())))
                .andExpect(status().isCreated());

        assertThat(mockMvc.perform(get("/api/incomes/month?year=2026&month=8").header("Authorization", bearer(user))).andReturn().getResponse().getContentAsString()).isEqualTo(incomesBefore);
        assertThat(mockMvc.perform(get("/api/expenses/summary?year=2026&month=8").header("Authorization", bearer(user))).andReturn().getResponse().getContentAsString()).isEqualTo(summaryBefore);
        assertThat(mockMvc.perform(get("/api/expenses/compare?year=2026&month=8").header("Authorization", bearer(user))).andReturn().getResponse().getContentAsString()).isEqualTo(comparisonBefore);
        assertThat(mockMvc.perform(get("/api/balance/month?year=2026&month=8").header("Authorization", bearer(user))).andReturn().getResponse().getContentAsString()).isEqualTo(balanceBefore);
        assertThat(mockMvc.perform(get("/api/dashboard/month?year=2026&month=8").header("Authorization", bearer(user))).andReturn().getResponse().getContentAsString()).isEqualTo(dashboardBefore);
        BigDecimal netWorthAfter = ledgerService.getAccountBalance(user.getId(), source.getId())
                .add(ledgerService.getAccountBalance(user.getId(), destination.getId()));
        assertThat(netWorthAfter).isEqualByComparingTo(netWorthBefore);
    }

    private User createUser() {
        Role role = roleRepository.findByName("USER").orElseGet(() -> {
            Role created = new Role();
            created.setName("USER");
            return roleRepository.save(created);
        });
        User user = new User();
        user.setName("Ledger adapter test");
        user.setEmail("adapter-" + UUID.randomUUID() + "@test.local");
        user.setPassword(passwordEncoder.encode("password123"));
        user.getRoles().add(role);
        return userRepository.save(user);
    }

    private Account createAccount(User user, boolean active) {
        Account account = new Account();
        account.setName("Account-" + UUID.randomUUID());
        account.setUser(user);
        account.setType(AccountType.BANK);
        account.setCurrency("COP");
        account.setActive(active);
        return accountRepository.save(account);
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user.getEmail());
    }
}
