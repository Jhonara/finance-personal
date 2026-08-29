package com.jr.finance.api;

import com.jr.finance.api.account.Account;
import com.jr.finance.api.account.AccountRepository;
import com.jr.finance.api.account.AccountType;
import com.jr.finance.api.auth.JwtService;
import com.jr.finance.api.budget.BudgetRepository;
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

    @BeforeEach
    void cleanDatabase() {
        ledgerEntryRepository.deleteAll();
        financialTransactionRepository.deleteAll();
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

        mockMvc.perform(post("/api/budgets").header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.categoryId").value(food.getId()))
                .andExpect(jsonPath("$.period").value("2026-08"))
                .andExpect(jsonPath("$.limitAmount").value(500000))
                .andExpect(jsonPath("$.version").value(0));
        mockMvc.perform(post("/api/budgets").header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict());
        mockMvc.perform(post("/api/budgets").header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"categoryId\":%d,\"year\":2026,\"month\":8,\"limitAmount\":0}".formatted(food.getId())))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/budgets").header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"categoryId\":%d,\"year\":2026,\"month\":13,\"limitAmount\":1}".formatted(food.getId())))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/budgets").header("Authorization", bearer(owner))
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

        mockMvc.perform(get("/api/budgets/{id}", budgetId).header("Authorization", bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.spentAmount").value(175000))
                .andExpect(jsonPath("$.remainingAmount").value(25000))
                .andExpect(jsonPath("$.percentageUsed").value(87.5))
                .andExpect(jsonPath("$.status").value("WARNING"));

        ledgerService.reverseTransaction(reversible.getId(), user.getId());
        mockMvc.perform(get("/api/budgets?year=2026&month=8").header("Authorization", bearer(user)))
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

        mockMvc.perform(patch("/api/budgets/{id}", id).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"limitAmount\":700000,\"version\":0}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.limitAmount").value(700000))
                .andExpect(jsonPath("$.version").value(1));
        mockMvc.perform(patch("/api/budgets/{id}", id).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"limitAmount\":1,\"version\":0}"))
                .andExpect(status().isConflict());
        mockMvc.perform(get("/api/budgets/{id}", foreignId).header("Authorization", bearer(owner)))
                .andExpect(status().isNotFound());
        mockMvc.perform(patch("/api/budgets/{id}", foreignId).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"limitAmount\":1,\"version\":0}"))
                .andExpect(status().isNotFound());
        assertThat(budgetRepository.count()).isEqualTo(2);
    }

    private Long createBudget(User user, Category category, String limit) throws Exception {
        String response = mockMvc.perform(post("/api/budgets").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"categoryId\":%d,\"year\":2026,\"month\":8,\"limitAmount\":%s}".formatted(category.getId(), limit)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return Long.valueOf(response.replaceAll(".*\"id\":(\\d+).*", "$1"));
    }

    private FinancialOperationCommand command(String amount, LocalDate date, Long categoryId) {
        return new FinancialOperationCommand(new BigDecimal(amount), date, null, "COP", categoryId);
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
