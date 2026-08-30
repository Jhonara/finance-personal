package com.jr.finance.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class PostgreSqlEndToEndApiTests {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("finance_e2e")
            .withUsername("finance")
            .withPassword("finance");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", POSTGRES::getDriverClassName);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("spring.flyway.baseline-on-migrate", () -> "false");
        registry.add("springdoc.api-docs.enabled", () -> "true");
        registry.add("jwt.secret", () -> "e2e-postgres-jwt-secret-for-isolated-tests-only");
        registry.add("cors.allowed-origins", () -> "http://localhost");
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void newUserCanCompleteThePrimaryFinancialFlowOnlyThroughPublicApi() throws Exception {
        LocalDate today = LocalDate.now();
        String email = "e2e-" + UUID.randomUUID() + "@example.com";
        JsonNode registration = postJson("/api/v1/auth/register", null,
                "{\"name\":\"E2E User\",\"email\":\"%s\",\"password\":\"password123\"}".formatted(email), 201);
        String firstAccessToken = registration.path("accessToken").asText();
        String firstRefreshToken = registration.path("refreshToken").asText();
        assertThat(firstAccessToken).isNotBlank();
        assertThat(firstRefreshToken).isNotBlank();

        JsonNode login = postJson("/api/v1/auth/login", null,
                "{\"email\":\"%s\",\"password\":\"password123\"}".formatted(email), 200);
        String accessToken = login.path("accessToken").asText();
        JsonNode refreshed = postJson("/api/v1/auth/refresh", null,
                "{\"refreshToken\":\"%s\"}".formatted(login.path("refreshToken").asText()), 200);
        String rotatedRefreshToken = refreshed.path("refreshToken").asText();
        assertThat(rotatedRefreshToken).isNotBlank();

        mockMvc.perform(get("/api/v1/accounts").header("Authorization", bearer(accessToken)))
                .andExpect(status().isOk());

        long expenseCategoryId = postJson("/api/v1/categories", accessToken,
                "{\"name\":\"Food\",\"type\":\"EXPENSE\"}", 201).path("id").asLong();
        long incomeCategoryId = postJson("/api/v1/categories", accessToken,
                "{\"name\":\"Salary\",\"type\":\"INCOME\"}", 201).path("id").asLong();
        long cashAccountId = createAccount(accessToken, "Cash", "CASH");
        long bankAccountId = createAccount(accessToken, "Bank", "BANK");
        long savingsAccountId = createAccount(accessToken, "Savings", "SAVINGS");

        JsonNode cashOpening = postJson("/api/v1/accounts/%d/opening-balance".formatted(cashAccountId), accessToken,
                "{\"amount\":1000000.00,\"effectiveDate\":\"%s\",\"description\":\"Initial cash\"}".formatted(today), 201);
        assertThat(cashOpening.path("type").asText()).isEqualTo("OPENING_BALANCE");
        postJson("/api/v1/accounts/%d/opening-balance".formatted(bankAccountId), accessToken,
                "{\"amount\":500000.00,\"effectiveDate\":\"%s\"}".formatted(today), 201);
        JsonNode negativeOpening = postJson("/api/v1/accounts/%d/opening-balance".formatted(savingsAccountId), accessToken,
                "{\"amount\":-1000.00,\"effectiveDate\":\"%s\"}".formatted(today), 201);
        assertThat(negativeOpening.path("amount").decimalValue()).isEqualByComparingTo("-1000.00");

        postError("/api/v1/accounts/%d/opening-balance".formatted(cashAccountId), accessToken,
                "{\"amount\":0,\"effectiveDate\":\"%s\"}".formatted(today), 400, "BAD_REQUEST");
        postError("/api/v1/accounts/%d/opening-balance".formatted(cashAccountId), accessToken,
                "{\"amount\":1,\"effectiveDate\":\"%s\"}".formatted(today), 409, "CONFLICT");

        JsonNode income = postJson("/api/v1/incomes", accessToken,
                "{\"amount\":300000.00,\"description\":\"Salary\",\"incomeType\":\"SALARY\",\"categoryId\":%d,\"incomeDate\":\"%s\",\"accountId\":%d}"
                        .formatted(incomeCategoryId, today, cashAccountId), 201);
        assertThat(income.path("id").asLong()).isPositive();
        JsonNode expense = postJson("/api/v1/expenses", accessToken,
                "{\"amount\":100000.00,\"description\":\"Groceries\",\"paymentType\":\"CASH\",\"expenseType\":\"VARIABLE\",\"expenseDate\":\"%s\",\"categoryId\":%d,\"accountId\":%d}"
                        .formatted(today, expenseCategoryId, cashAccountId), 201);
        long expenseId = expense.path("id").asLong();

        postJson("/api/v1/budgets", accessToken,
                "{\"categoryId\":%d,\"year\":%d,\"month\":%d,\"limitAmount\":500000.00}"
                        .formatted(expenseCategoryId, today.getYear(), today.getMonthValue()), 201);
        long goalId = postJson("/api/v1/savings/goals", accessToken,
                "{\"name\":\"Emergency fund\",\"targetAmount\":2000000.00}", 201).path("id").asLong();
        postJson("/api/v1/savings/goals/%d/movements".formatted(goalId), accessToken,
                "{\"amount\":50000.00,\"movementDate\":\"%s\"}".formatted(today), 200);

        JsonNode transfer = postJson("/api/v1/transfers", accessToken,
                "{\"sourceAccountId\":%d,\"destinationAccountId\":%d,\"amount\":200000.00,\"effectiveDate\":\"%s\",\"description\":\"Cash deposit\"}"
                        .formatted(cashAccountId, bankAccountId, today), 201);
        assertThat(transfer.path("currency").asText()).isEqualTo("COP");

        JsonNode credit = postJson("/api/v1/credits", accessToken,
                "{\"name\":\"Working capital\",\"principal\":300000.00,\"annualRate\":0.00,\"termMonths\":12,\"disbursementDate\":\"%s\",\"paymentDay\":%d,\"currency\":\"COP\",\"disbursementAccountId\":%d}"
                        .formatted(today, today.getDayOfMonth(), bankAccountId), 201);
        long creditId = credit.path("id").asLong();
        JsonNode payment = postJson("/api/v1/credits/%d/payments".formatted(creditId), accessToken,
                "{\"amount\":100000.00,\"paymentDate\":\"%s\",\"accountId\":%d}".formatted(today, bankAccountId), 200);
        long paymentId = payment.path("paymentId").asLong();
        assertThat(payment.path("financialTransactionId").asLong()).isPositive();

        JsonNode history = getJson("/api/v1/transactions?year=%d&month=%d&size=100".formatted(today.getYear(), today.getMonthValue()), accessToken);
        Set<String> types = new HashSet<>();
        history.path("content").forEach(node -> types.add(node.path("type").asText()));
        assertThat(types).contains("OPENING_BALANCE", "INCOME", "EXPENSE", "TRANSFER", "CREDIT_DISBURSEMENT", "CREDIT_PAYMENT");
        assertThat(history.path("totalElements").asInt()).isGreaterThanOrEqualTo(8);

        JsonNode dashboardBeforeReversal = getJson("/api/v1/dashboard/month?year=%d&month=%d".formatted(today.getYear(), today.getMonthValue()), accessToken);
        assertThat(dashboardBeforeReversal.path("totalIncome").decimalValue()).isEqualByComparingTo("300000.00");
        assertThat(dashboardBeforeReversal.path("totalExpense").decimalValue()).isEqualByComparingTo("100000.00");
        assertThat(dashboardBeforeReversal.path("liabilitiesByCurrency").path("COP").decimalValue()).isEqualByComparingTo("200000.00");
        assertThat(dashboardBeforeReversal.path("recentTransactions").size()).isGreaterThan(0);
        assertThat(getJson("/api/v1/alerts", accessToken)).isNotNull();

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/v1/expenses/{id}", expenseId)
                        .header("Authorization", bearer(accessToken)))
                .andExpect(status().isOk());
        postJson("/api/v1/credits/%d/payments/%d/reverse".formatted(creditId, paymentId), accessToken, "{}", 200);

        JsonNode dashboard = getJson("/api/v1/dashboard/month?year=%d&month=%d".formatted(today.getYear(), today.getMonthValue()), accessToken);
        assertThat(dashboard.path("totalIncome").decimalValue()).isEqualByComparingTo("300000.00");
        assertThat(dashboard.path("totalExpense").decimalValue()).isEqualByComparingTo("0.00");
        assertThat(dashboard.path("liabilitiesByCurrency").path("COP").decimalValue()).isEqualByComparingTo("300000.00");
        assertThat(dashboard.path("assetsByCurrency").path("COP").decimalValue()).isEqualByComparingTo("2099000.00");
        assertThat(dashboard.path("netWorthByCurrency").path("COP").decimalValue()).isEqualByComparingTo("1799000.00");
        assertThat(accountBalance(cashAccountId)).isEqualByComparingTo("1100000.00");
        assertThat(accountBalance(bankAccountId)).isEqualByComparingTo("1000000.00");
        assertThat(accountBalance(savingsAccountId)).isEqualByComparingTo("-1000.00");

        mockMvc.perform(post("/api/v1/auth/logout").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"%s\"}".formatted(rotatedRefreshToken)))
                .andExpect(status().isNoContent());
        postError("/api/v1/auth/refresh", null, "{\"refreshToken\":\"%s\"}".formatted(rotatedRefreshToken), 401, "UNAUTHORIZED");
        mockMvc.perform(get("/api/v1/accounts")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.timestamp").exists()).andExpect(jsonPath("$.fieldErrors").exists());
        mockMvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/v1/accounts/{accountId}/opening-balance']").exists());
    }

    @Test
    void openingBalanceRejectsForeignAndInactiveAccountsWithTheUniformErrorContract() throws Exception {
        String ownerEmail = "owner-" + UUID.randomUUID() + "@example.com";
        String otherEmail = "other-" + UUID.randomUUID() + "@example.com";
        String ownerToken = postJson("/api/v1/auth/register", null,
                "{\"name\":\"Owner\",\"email\":\"%s\",\"password\":\"password123\"}".formatted(ownerEmail), 201).path("accessToken").asText();
        String otherToken = postJson("/api/v1/auth/register", null,
                "{\"name\":\"Other\",\"email\":\"%s\",\"password\":\"password123\"}".formatted(otherEmail), 201).path("accessToken").asText();
        long ownerAccountId = createAccount(ownerToken, "Private", "BANK");
        postError("/api/v1/accounts/%d/opening-balance".formatted(ownerAccountId), otherToken,
                "{\"amount\":1,\"effectiveDate\":\"%s\"}".formatted(LocalDate.now()), 404, "NOT_FOUND");

        long inactiveAccountId = createAccount(ownerToken, "Inactive", "BANK");
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/v1/accounts/{id}", inactiveAccountId)
                        .header("Authorization", bearer(ownerToken)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"active\":false,\"version\":0}"))
                .andExpect(status().isOk());
        postError("/api/v1/accounts/%d/opening-balance".formatted(inactiveAccountId), ownerToken,
                "{\"amount\":1,\"effectiveDate\":\"%s\"}".formatted(LocalDate.now()), 400, "BAD_REQUEST");
    }

    private long createAccount(String token, String name, String type) throws Exception {
        return postJson("/api/v1/accounts", token,
                "{\"name\":\"%s\",\"type\":\"%s\",\"currency\":\"COP\"}".formatted(name, type), 201).path("id").asLong();
    }

    private BigDecimal accountBalance(long accountId) {
        BigDecimal balance = jdbcTemplate.queryForObject("""
                select coalesce(sum(entry.signed_amount), 0)
                from ledger_entries entry
                join financial_transactions transaction on transaction.id = entry.financial_transaction_id
                where entry.account_id = ? and transaction.status <> 'VOIDED'
                """, BigDecimal.class, accountId);
        return balance == null ? BigDecimal.ZERO : balance;
    }

    private JsonNode getJson(String path, String token) throws Exception {
        return objectMapper.readTree(mockMvc.perform(get(path).header("Authorization", bearer(token)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    private JsonNode postJson(String path, String token, String body, int expectedStatus) throws Exception {
        MockHttpServletRequestBuilder request = post(path).contentType(MediaType.APPLICATION_JSON).content(body);
        if (token != null) request.header("Authorization", bearer(token));
        return objectMapper.readTree(mockMvc.perform(request).andExpect(status().is(expectedStatus))
                .andReturn().getResponse().getContentAsString());
    }

    private void postError(String path, String token, String body, int expectedStatus, String expectedCode) throws Exception {
        MockHttpServletRequestBuilder request = post(path).contentType(MediaType.APPLICATION_JSON).content(body);
        if (token != null) request.header("Authorization", bearer(token));
        mockMvc.perform(request).andExpect(status().is(expectedStatus))
                .andExpect(jsonPath("$.timestamp").exists()).andExpect(jsonPath("$.status").value(expectedStatus))
                .andExpect(jsonPath("$.code").value(expectedCode)).andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.path").value(path)).andExpect(jsonPath("$.fieldErrors").exists());
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
