package com.jr.finance.api;

import com.jr.finance.api.auth.JwtService;
import com.jr.finance.api.credit.Credit;
import com.jr.finance.api.credit.CreditRepository;
import com.jr.finance.api.credit.CreditPaymentRepository;
import com.jr.finance.api.account.Account;
import com.jr.finance.api.account.AccountRepository;
import com.jr.finance.api.account.AccountType;
import com.jr.finance.api.ledger.LedgerService;
import com.jr.finance.api.ledger.FinancialOperationCommand;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CreditCoreIntegrationTests {
    @Autowired private MockMvc mvc;
    @Autowired private JwtService jwt;
    @Autowired private PasswordEncoder encoder;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private CreditRepository credits;
    @Autowired private CreditPaymentRepository payments;
    @Autowired private AccountRepository accounts;
    @Autowired private LedgerService ledger;

    @Test
    void createsCreditAndAllocatesPaymentWithoutUsingInterestAsPrincipal() throws Exception {
        User user = user();
        String body = "{\"name\":\"Car\",\"principal\":1000,\"annualRate\":12,\"termMonths\":12,\"disbursementDate\":\"2025-01-15\",\"paymentDay\":15,\"currency\":\"COP\"}";
        String response = mvc.perform(post("/api/v1/credits").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.currency").value("COP"))
                .andExpect(jsonPath("$.remainingBalance").value(1000)).andReturn().getResponse().getContentAsString();
        Long id = Long.valueOf(response.replaceAll(".*\\\"id\\\":(\\d+).*", "$1"));
        mvc.perform(post("/api/v1/credits/{id}/payments", id).header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"amount\":100,\"paymentDate\":\"2026-08-01\",\"extraPrincipalAmount\":20}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalAmount").value(100))
                .andExpect(jsonPath("$.extraPrincipalAmount").value(20))
                .andExpect(jsonPath("$.interestAmount").isNumber())
                .andExpect(jsonPath("$.newBalance").exists());
        var payment = payments.findByCreditIdOrderByPaymentDateAsc(id).getFirst();
        org.assertj.core.api.Assertions.assertThat(payment.getTotalAmount())
                .isEqualByComparingTo(payment.getInterestAmount().add(payment.getPrincipalAmount()).add(payment.getExtraPrincipalAmount()));
    }

    @Test
    void rejectsOverpaymentInvalidDatesAndForeignCreditAccess() throws Exception {
        User owner = user(); User other = user();
        Credit credit = new Credit(); credit.setUser(owner); credit.setName("Loan"); credit.setPrincipal(new BigDecimal("100"));
        credit.setAnnualRate(BigDecimal.ZERO); credit.setTermMonths(1); credit.setDisbursementDate(LocalDate.now().minusMonths(1)); credit.setPaymentDay(15); credit.setCurrency("COP");
        credit = credits.saveAndFlush(credit);
        String auth = bearer(owner);
        mvc.perform(post("/api/v1/credits/{id}/payments", credit.getId()).header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":101,\"paymentDate\":\"" + LocalDate.now() + "\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/credits/{id}/payments", credit.getId()).header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":1,\"paymentDate\":\"2000-01-01\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/credits/{id}", credit.getId()).header("Authorization", bearer(other))).andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/credits/{id}/payments", credit.getId()).header("Authorization", bearer(other)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":1,\"paymentDate\":\"" + LocalDate.now() + "\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void linksDisbursementAndPaymentToLedgerAndReversesTheWholePayment() throws Exception {
        User user = user();
        Account account = new Account(); account.setUser(user); account.setName("Cash credit"); account.setType(AccountType.BANK); account.setCurrency("COP"); account.setActive(true);
        account = accounts.saveAndFlush(account);
        ledger.recordOpeningBalance(user.getId(), account.getId(), new FinancialOperationCommand(new BigDecimal("1000"), LocalDate.now().minusMonths(2), "opening", "COP", null));
        String body = "{\"name\":\"Linked\",\"principal\":1000,\"annualRate\":0,\"termMonths\":2,\"disbursementDate\":\"" + LocalDate.now().minusMonths(1) + "\",\"paymentDay\":15,\"currency\":\"COP\",\"disbursementAccountId\":" + account.getId() + "}";
        String created = mvc.perform(post("/api/v1/credits").header("Authorization", bearer(user)).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.disbursementLinked").value(true)).andExpect(jsonPath("$.disbursementTransactionId").isNumber())
                .andReturn().getResponse().getContentAsString();
        Long creditId = Long.valueOf(created.replaceAll(".*\\\"id\\\":(\\d+).*", "$1"));
        String paid = mvc.perform(post("/api/v1/credits/{id}/payments", creditId).header("Authorization", bearer(user)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":500,\"paymentDate\":\"" + LocalDate.now() + "\",\"accountId\":" + account.getId() + "}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.accountId").value(account.getId())).andExpect(jsonPath("$.financialTransactionId").isNumber())
                .andExpect(jsonPath("$.paymentStatus").value("POSTED")).andReturn().getResponse().getContentAsString();
        Long paymentId = Long.valueOf(paid.replaceAll(".*\\\"paymentId\\\":(\\d+).*", "$1"));
        org.assertj.core.api.Assertions.assertThat(ledger.getAccountBalance(user.getId(), account.getId())).isEqualByComparingTo("1500.0000");
        mvc.perform(post("/api/v1/credits/{creditId}/payments/{paymentId}/reverse", creditId, paymentId).header("Authorization", bearer(user)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.paymentStatus").value("REVERSED"));
        org.assertj.core.api.Assertions.assertThat(ledger.getAccountBalance(user.getId(), account.getId())).isEqualByComparingTo("2000.0000");
        mvc.perform(post("/api/v1/credits/{creditId}/payments/{paymentId}/reverse", creditId, paymentId).header("Authorization", bearer(user)))
                .andExpect(status().isConflict());
    }

    private User user() {
        Role role = roles.findByName("USER").orElseGet(() -> roles.save(new Role(null, "USER")));
        User user = new User(); user.setName("Credit test"); user.setEmail("credit-" + UUID.randomUUID() + "@test.local"); user.setPassword(encoder.encode("password")); user.setRoles(java.util.Set.of(role));
        return users.save(user);
    }
    private String bearer(User user) { return "Bearer " + jwt.generateToken(user.getEmail()); }
}
