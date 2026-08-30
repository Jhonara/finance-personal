package com.jr.finance.api;

import com.jr.finance.api.account.Account;
import com.jr.finance.api.account.AccountRepository;
import com.jr.finance.api.account.AccountType;
import com.jr.finance.api.auth.JwtService;
import com.jr.finance.api.budget.BudgetRepository;
import com.jr.finance.api.expense.Category;
import com.jr.finance.api.expense.CategoryRepository;
import com.jr.finance.api.expense.CategoryType;
import com.jr.finance.api.ledger.FinancialTransactionRepository;
import com.jr.finance.api.ledger.LedgerEntryRepository;
import com.jr.finance.api.user.Role;
import com.jr.finance.api.user.RoleRepository;
import com.jr.finance.api.user.User;
import com.jr.finance.api.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CategoryIntegrationTests {

    @Autowired private MockMvc mvc;
    @Autowired private JwtService jwt;
    @Autowired private PasswordEncoder encoder;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private AccountRepository accounts;
    @Autowired private CategoryRepository categories;
    @Autowired private BudgetRepository budgets;
    @Autowired private FinancialTransactionRepository transactions;
    @Autowired private LedgerEntryRepository entries;

    @Test
    void createsTypedCategoriesRejectsDuplicatesAndListsWithFilters() throws Exception {
        User user = user();
        String expense = create(user, "Otros", "EXPENSE");
        String income = create(user, "Otros", "INCOME");

        mvc.perform(post("/api/v1/categories").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Otros\",\"type\":\"EXPENSE\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CONFLICT"));
        mvc.perform(post("/api/v1/categories").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Sin tipo\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.type").exists());
        mvc.perform(post("/api/v1/categories").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Inválida\",\"type\":\"OTHER\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));

        mvc.perform(get("/api/v1/categories").header("Authorization", bearer(user)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
        mvc.perform(get("/api/v1/categories?type=EXPENSE").header("Authorization", bearer(user)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(expense));
        mvc.perform(get("/api/v1/categories?type=INCOME&active=true").header("Authorization", bearer(user)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(income));
    }

    @Test
    void deactivateAndReactivateKeepTheCategoryAndEnforceOwnership() throws Exception {
        User owner = user();
        User other = user();
        String id = create(owner, "Comida", "EXPENSE");

        mvc.perform(delete("/api/v1/categories/{id}", id).header("Authorization", bearer(owner)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/categories").header("Authorization", bearer(owner)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/v1/categories?active=false").header("Authorization", bearer(owner)))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(id))
                .andExpect(jsonPath("$[0].active").value(false));
        mvc.perform(get("/api/v1/categories/{id}", id).header("Authorization", bearer(other)))
                .andExpect(status().isNotFound());

        mvc.perform(patch("/api/v1/categories/{id}", id).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"active\":true,\"version\":1}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.type").value("EXPENSE"));
        mvc.perform(patch("/api/v1/categories/{id}", id).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"INCOME\",\"version\":2}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void enforcesTypedActiveCategoriesForIncomeExpenseAndBudgetAndKeepsHistory() throws Exception {
        User user = user();
        User other = user();
        Account account = account(user);
        String expenseCategory = create(user, "Comida", "EXPENSE");
        String incomeCategory = create(user, "Salario", "INCOME");

        mvc.perform(post("/api/v1/expenses").header("Authorization", bearer(user)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":100,\"paymentType\":\"CARD\",\"expenseType\":\"VARIABLE\",\"expenseDate\":\"2026-08-10\",\"accountId\":%s,\"categoryId\":%s}".formatted(account.getId(), expenseCategory)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.category").value("Comida"));
        mvc.perform(post("/api/v1/incomes").header("Authorization", bearer(user)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":500,\"incomeType\":\"SALARY\",\"incomeDate\":\"2026-08-11\",\"accountId\":%s,\"categoryId\":%s}".formatted(account.getId(), incomeCategory)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.categoryId").value(incomeCategory))
                .andExpect(jsonPath("$.categoryName").value("Salario"));
        mvc.perform(post("/api/v1/incomes").header("Authorization", bearer(user)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":10,\"incomeType\":\"EXTRA\",\"incomeDate\":\"2026-08-11\",\"accountId\":%s}".formatted(account.getId())))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/expenses").header("Authorization", bearer(user)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":1,\"paymentType\":\"CARD\",\"expenseType\":\"VARIABLE\",\"expenseDate\":\"2026-08-11\",\"accountId\":%s,\"categoryId\":%s}".formatted(account.getId(), incomeCategory)))
                .andExpect(status().isBadRequest());
        String foreignExpense = create(other, "Ajena", "EXPENSE");
        mvc.perform(post("/api/v1/expenses").header("Authorization", bearer(user)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":1,\"paymentType\":\"CARD\",\"expenseType\":\"VARIABLE\",\"expenseDate\":\"2026-08-11\",\"accountId\":%s,\"categoryId\":%s}".formatted(account.getId(), foreignExpense)))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/budgets").header("Authorization", bearer(user)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"categoryId\":%s,\"year\":2026,\"month\":8,\"limitAmount\":1000}".formatted(incomeCategory)))
                .andExpect(status().isBadRequest());

        mvc.perform(delete("/api/v1/categories/{id}", incomeCategory).header("Authorization", bearer(user)))
                .andExpect(status().isNoContent());
        mvc.perform(post("/api/v1/incomes").header("Authorization", bearer(user)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":10,\"incomeType\":\"EXTRA\",\"incomeDate\":\"2026-08-11\",\"accountId\":%s,\"categoryId\":%s}".formatted(account.getId(), incomeCategory)))
                .andExpect(status().isBadRequest());

        mvc.perform(delete("/api/v1/categories/{id}", expenseCategory).header("Authorization", bearer(user)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/transactions?categoryId={id}", expenseCategory).header("Authorization", bearer(user)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(post("/api/v1/expenses").header("Authorization", bearer(user)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":1,\"paymentType\":\"CARD\",\"expenseType\":\"VARIABLE\",\"expenseDate\":\"2026-08-11\",\"accountId\":%s,\"categoryId\":%s}".formatted(account.getId(), expenseCategory)))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/budgets").header("Authorization", bearer(user)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"categoryId\":%s,\"year\":2026,\"month\":8,\"limitAmount\":1000}".formatted(expenseCategory)))
                .andExpect(status().isBadRequest());
    }

    private String create(User user, String name, String type) throws Exception {
        String body = mvc.perform(post("/api/v1/categories").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"%s\",\"type\":\"%s\"}".formatted(name, type)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return body.replaceAll(".*\"id\":(\\d+).*", "$1");
    }

    private Account account(User user) {
        Account account = new Account(); account.setUser(user); account.setName("Cuenta " + UUID.randomUUID());
        account.setType(AccountType.BANK); account.setCurrency("COP"); account.setActive(true);
        return accounts.saveAndFlush(account);
    }

    private User user() {
        Role role = roles.findByName("USER").orElseGet(() -> { Role created = new Role(); created.setName("USER"); return roles.save(created); });
        User user = new User(); user.setName("Category Test"); user.setEmail(UUID.randomUUID() + "@test.local");
        user.setPassword(encoder.encode("password123")); user.getRoles().add(role);
        return users.saveAndFlush(user);
    }

    private String bearer(User user) { return "Bearer " + jwt.generateToken(user.getEmail()); }
}
