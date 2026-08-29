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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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

    @BeforeEach
    void cleanDatabase() {
        ledgerEntryRepository.deleteAll();
        financialTransactionRepository.deleteAll();
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
    void legacyHistoryAndLedgerBackedOperationsAreReadTogether() throws Exception {
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
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
        mockMvc.perform(get("/api/balance/month?year=2026&month=8").header("Authorization", bearer(user)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalIncome").value(150000));
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
