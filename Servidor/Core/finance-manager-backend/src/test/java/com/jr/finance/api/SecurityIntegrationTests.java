package com.jr.finance.api;

import com.jr.finance.api.auth.JwtService;
import com.jr.finance.api.auth.RefreshTokenRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jr.finance.api.account.Account;
import com.jr.finance.api.account.AccountRepository;
import com.jr.finance.api.account.AccountType;
import com.jr.finance.api.ledger.FinancialTransactionRepository;
import com.jr.finance.api.ledger.LedgerEntryRepository;
import com.jr.finance.api.expense.Category;
import com.jr.finance.api.expense.CategoryRepository;
import com.jr.finance.api.expense.ExpenseRepository;
import com.jr.finance.api.user.Role;
import com.jr.finance.api.user.RoleRepository;
import com.jr.finance.api.user.User;
import com.jr.finance.api.user.UserRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Date;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityIntegrationTests {

    private static final String TEST_JWT_SECRET = "test-jwt-secret-for-isolated-context-tests-only";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ExpenseRepository expenseRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;

    @Autowired
    private FinancialTransactionRepository financialTransactionRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void cleanDatabase() {
        ledgerEntryRepository.deleteAll();
        financialTransactionRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        expenseRepository.deleteAll();
        categoryRepository.deleteAll();
        accountRepository.deleteAll();
        userRepository.deleteAll();
        roleRepository.deleteAll();
    }

    @Test
    void loginWithValidCredentialsReturnsTokenAndTokenGrantsAccess() throws Exception {
        createUser("user@example.com", "password123", "USER");

        String response = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"user@example.com\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String token = objectMapper.readValue(response, Map.class).get("accessToken").toString();

        mockMvc.perform(get("/api/v1/categories")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void loginDoesNotRevealWhetherUserExists() throws Exception {
        createUser("user@example.com", "password123", "USER");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"user@example.com\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Credenciales inválidas"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"missing@example.com\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Credenciales inválidas"));
    }

    @Test
    void protectedEndpointsReturnConsistentUnauthorizedErrorsForInvalidTokens() throws Exception {
        String validToken = jwtService.generateToken("missing@example.com");

        mockMvc.perform(get("/api/v1/categories"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

        mockMvc.perform(get("/api/v1/categories").header("Authorization", "Bearer not-a-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Authentication required."));

        mockMvc.perform(get("/api/v1/categories").header("Authorization", "Bearer " + expiredToken()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Authentication required."));

        mockMvc.perform(get("/api/v1/categories").header("Authorization", "Bearer " + validToken + "tampered"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Authentication required."));
    }

    @Test
    void usersEndpointRequiresAdminAndNeverReturnsPasswordData() throws Exception {
        User regularUser = createUser("user@example.com", "password123", "USER");
        User adminUser = createUser("admin@example.com", "password123", "ADMIN");

        mockMvc.perform(get("/api/v1/users")
                        .header("Authorization", bearer(regularUser)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        mockMvc.perform(get("/api/v1/users")
                        .header("Authorization", bearer(adminUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].password").doesNotExist())
                .andExpect(content().string(not(containsString("password123"))))
                .andExpect(content().string(not(containsString("$2a$"))));
    }

    @Test
    void userCannotCreateExpenseWithAnotherUsersCategory() throws Exception {
        User userA = createUser("a@example.com", "password123", "USER");
        User userB = createUser("b@example.com", "password123", "USER");

        Category category = new Category();
        category.setName("Private category");
        category.setUser(userB);
        category = categoryRepository.save(category);

        Account account = new Account();
        account.setName("User A account");
        account.setUser(userA);
        account.setType(AccountType.BANK);
        account.setCurrency("COP");
        account.setActive(true);
        account = accountRepository.save(account);

        mockMvc.perform(post("/api/v1/expenses")
                        .header("Authorization", bearer(userA))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"amount":100,"paymentType":"CARD","expenseType":"VARIABLE", "expenseDate":"%s", "categoryId":%d, "accountId":%d}
                                """.formatted(LocalDate.now(), category.getId(), account.getId())))
                .andExpect(status().isNotFound());

        org.junit.jupiter.api.Assertions.assertEquals(0, expenseRepository.count());
    }

    @Test
    void periodEndpointsRejectInvalidMonthsAndYearsWithBadRequest() throws Exception {
        User user = createUser("period@example.com", "password123", "USER");
        String authorization = bearer(user);

        mockMvc.perform(get("/api/v1/incomes/month?year=2026&month=0")
                        .header("Authorization", authorization))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/expenses/summary?year=2026&month=13")
                        .header("Authorization", authorization))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/expenses/compare?year=1999&month=1")
                        .header("Authorization", authorization))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/expenses/compare-periods?year1=2026&month1=1&year2=2101&month2=1")
                        .header("Authorization", authorization))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/balance/month?year=2026&month=0")
                        .header("Authorization", authorization))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/dashboard/month?year=2101&month=1")
                        .header("Authorization", authorization))
                .andExpect(status().isBadRequest());
    }

    @Test
    void refreshRotationReuseDetectionLogoutAndLogoutAllWork() throws Exception {
        createUser("refresh@example.com", "password123", "USER");
        String login = mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"refresh@example.com\",\"password\":\"password123\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        Map<String, Object> first = objectMapper.readValue(login, Map.class);
        String firstRefresh = first.get("refreshToken").toString();

        String refreshed = mockMvc.perform(post("/api/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"%s\"}".formatted(firstRefresh)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andReturn().getResponse().getContentAsString();
        String secondRefresh = objectMapper.readValue(refreshed, Map.class).get("refreshToken").toString();
        org.junit.jupiter.api.Assertions.assertNotEquals(firstRefresh, secondRefresh);

        mockMvc.perform(post("/api/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"%s\"}".formatted(firstRefresh)))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        mockMvc.perform(post("/api/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"%s\"}".formatted(secondRefresh)))
                .andExpect(status().isUnauthorized());

        String relogin = mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"refresh@example.com\",\"password\":\"password123\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String refresh = objectMapper.readValue(relogin, Map.class).get("refreshToken").toString();
        mockMvc.perform(post("/api/v1/auth/logout").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"%s\"}".formatted(refresh)))
                .andExpect(status().isNoContent());
        mockMvc.perform(post("/api/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"%s\"}".formatted(refresh)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authenticationRateLimitAndValidationUseStableErrorContract() throws Exception {
        for (int attempt = 0; attempt < 5; attempt++) {
            mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"email\":\"limited@example.com\",\"password\":\"wrong-password\"}"))
                    .andExpect(status().isUnauthorized());
        }
        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"limited@example.com\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isTooManyRequests()).andExpect(jsonPath("$.code").value("RATE_LIMITED"))
                .andExpect(jsonPath("$.path").value("/api/v1/auth/login"));
        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"other@example.com\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.password").exists());
    }

    private User createUser(String email, String password, String roleName) {
        Role role = roleRepository.findByName(roleName).orElseGet(() -> {
            Role newRole = new Role();
            newRole.setName(roleName);
            return roleRepository.save(newRole);
        });

        User user = new User();
        user.setName(email);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.getRoles().add(role);
        return userRepository.save(user);
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user.getEmail());
    }

    private String expiredToken() {
        SecretKey key = Keys.hmacShaKeyFor(TEST_JWT_SECRET.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder()
                .subject("user@example.com")
                .expiration(new Date(System.currentTimeMillis() - 60_000))
                .signWith(key)
                .compact();
    }
}
