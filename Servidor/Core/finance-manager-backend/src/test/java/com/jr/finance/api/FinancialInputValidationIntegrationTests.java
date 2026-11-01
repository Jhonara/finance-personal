package com.jr.finance.api;

import com.jr.finance.api.account.Account;
import com.jr.finance.api.account.AccountRepository;
import com.jr.finance.api.account.AccountType;
import com.jr.finance.api.auth.JwtService;
import com.jr.finance.api.credit.Credit;
import com.jr.finance.api.credit.CreditPaymentRepository;
import com.jr.finance.api.credit.CreditRepository;
import com.jr.finance.api.ledger.FinancialTransactionRepository;
import com.jr.finance.api.ledger.LedgerEntryRepository;
import com.jr.finance.api.ledger.LedgerService;
import com.jr.finance.api.user.Role;
import com.jr.finance.api.user.RoleRepository;
import com.jr.finance.api.user.User;
import com.jr.finance.api.user.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class FinancialInputValidationIntegrationTests {
    @Autowired private MockMvc mvc;
    @Autowired private JwtService jwt;
    @Autowired private PasswordEncoder encoder;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private AccountRepository accounts;
    @Autowired private CreditRepository credits;
    @Autowired private CreditPaymentRepository payments;
    @Autowired private FinancialTransactionRepository transactions;
    @Autowired private LedgerEntryRepository entries;
    @Autowired private LedgerService ledger;

    @Test
    void rejectsAmountsBelowStoragePrecisionWithoutPersistingFinancialRows() throws Exception {
        Fixture fixture = fixture();
        long transactionCount = transactions.count();
        long entryCount = entries.count();
        long paymentCount = payments.count();

        rejectAmount("/api/v1/incomes", income(fixture.accountId(), "0.00001"), fixture.auth(), "amount");
        rejectAmount("/api/v1/expenses", expense(fixture.accountId(), "0.00001"), fixture.auth(), "amount");
        rejectAmount("/api/v1/accounts/" + fixture.accountId() + "/opening-balance",
                "{\"amount\":0.00001,\"effectiveDate\":\"" + LocalDate.now() + "\"}", fixture.auth(), "amount");
        rejectAmount("/api/v1/credits/" + fixture.creditId() + "/payments",
                payment(fixture.accountId(), "0.001", null), fixture.auth(), "amount");
        rejectAmount("/api/v1/credits/" + fixture.creditId() + "/payments",
                payment(fixture.accountId(), "1", "0.001"), fixture.auth(), "extraPrincipalAmount");
        rejectAmount("/api/v1/incomes", income(fixture.accountId(), "1000000000000000"), fixture.auth(), "amount");

        assertThat(transactions.count()).isEqualTo(transactionCount);
        assertThat(entries.count()).isEqualTo(entryCount);
        assertThat(payments.count()).isEqualTo(paymentCount);
    }

    @Test
    void preservesExistingFourDecimalLedgerAmountsAndTwoDecimalCreditPayments() throws Exception {
        Fixture fixture = fixture();
        mvc.perform(post("/api/v1/accounts/{id}/opening-balance", fixture.accountId())
                        .header("Authorization", fixture.auth()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":1.0001,\"effectiveDate\":\"" + LocalDate.now() + "\"}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/incomes").header("Authorization", fixture.auth())
                        .contentType(MediaType.APPLICATION_JSON).content(income(fixture.accountId(), "0.0100")))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/expenses").header("Authorization", fixture.auth())
                        .contentType(MediaType.APPLICATION_JSON).content(expense(fixture.accountId(), "0.0001")))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/credits/{id}/payments", fixture.creditId()).header("Authorization", fixture.auth())
                        .contentType(MediaType.APPLICATION_JSON).content(payment(fixture.accountId(), "0.01", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAmount").value(0.01))
                .andExpect(jsonPath("$.newBalance").value(999.99));
        assertThat(ledger.getAccountBalance(fixture.userId(), fixture.accountId())).isEqualByComparingTo("1.0000");
    }

    private void rejectAmount(String path, String body, String auth, String field) throws Exception {
        mvc.perform(post(path).header("Authorization", auth).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors." + field).isNotEmpty());
    }

    private String income(long accountId, String amount) {
        return "{\"amount\":" + amount + ",\"incomeType\":\"EXTRA\",\"incomeDate\":\""
                + LocalDate.now() + "\",\"accountId\":" + accountId + "}";
    }

    private String expense(long accountId, String amount) {
        return "{\"amount\":" + amount + ",\"expenseType\":\"VARIABLE\",\"paymentType\":\"CASH\",\"expenseDate\":\""
                + LocalDate.now() + "\",\"accountId\":" + accountId + "}";
    }

    private String payment(long accountId, String amount, String extra) {
        return "{\"amount\":" + amount + ",\"paymentDate\":\"" + LocalDate.now()
                + "\",\"accountId\":" + accountId + (extra == null ? "" : ",\"extraPrincipalAmount\":" + extra) + "}";
    }

    private Fixture fixture() {
        Role role = roles.findByName("USER").orElseGet(() -> roles.save(new Role(null, "USER")));
        User user = new User();
        user.setName("Financial validation QA");
        user.setEmail("amount-" + UUID.randomUUID() + "@test.local");
        user.setPassword(encoder.encode("password"));
        user.setRoles(Set.of(role));
        user = users.saveAndFlush(user);
        Account account = new Account();
        account.setUser(user); account.setName("Precision account"); account.setType(AccountType.BANK);
        account.setCurrency("COP"); account.setActive(true); account = accounts.saveAndFlush(account);
        Credit credit = new Credit();
        credit.setUser(user); credit.setName("Precision credit"); credit.setPrincipal(new BigDecimal("1000"));
        credit.setAnnualRate(BigDecimal.ZERO); credit.setTermMonths(12); credit.setCurrency("COP");
        credit.setDisbursementDate(LocalDate.now()); credit.setPaymentDay(15); credit = credits.saveAndFlush(credit);
        return new Fixture(user.getId(), account.getId(), credit.getId(), "Bearer " + jwt.generateToken(user.getEmail()));
    }

    private record Fixture(long userId, long accountId, long creditId, String auth) { }
}
