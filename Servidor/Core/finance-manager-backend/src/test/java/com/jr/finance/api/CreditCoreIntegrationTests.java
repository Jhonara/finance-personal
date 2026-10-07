package com.jr.finance.api;

import com.fasterxml.jackson.databind.ObjectMapper;
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
    @Autowired private ObjectMapper mapper;
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

    @Test
    void amortizationUsesOwnedCreditPostedPaymentsAndDoesNotPersistScenarios() throws Exception {
        User owner = user(); User other = user();
        Credit credit = new Credit(); credit.setUser(owner); credit.setName("Casa");
        credit.setPrincipal(new BigDecimal("1000")); credit.setAnnualRate(new BigDecimal("12"));
        credit.setTermMonths(12); credit.setDisbursementDate(LocalDate.now().minusMonths(1));
        credit.setPaymentDay(15); credit.setCurrency("COP");
        credit = credits.saveAndFlush(credit);
        Long id = credit.getId();
        mvc.perform(post("/api/v1/credits/{id}/payments", id).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":100,\"paymentDate\":\"" + LocalDate.now() + "\",\"extraPrincipalAmount\":20}"))
                .andExpect(status().isOk());

        String body = mvc.perform(get("/api/v1/credits/{id}/amortization", id)
                        .header("Authorization", bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.creditId").value(id))
                .andExpect(jsonPath("$.currency").value("COP"))
                .andExpect(jsonPath("$.payments.length()").value(1))
                .andExpect(jsonPath("$.payments[0].extraPrincipalAmount").value(20))
                .andExpect(jsonPath("$.recordedExtraTotal").value(20))
                .andExpect(jsonPath("$.interestSavedByRecordedExtras").isNumber())
                .andExpect(jsonPath("$.projectedSchedule[0].openingBalance").isNumber())
                .andReturn().getResponse().getContentAsString();
        int installment = mapper.readTree(body).path("nextInstallment").asInt();
        mvc.perform(post("/api/v1/credits/{id}/amortization/scenarios", id)
                        .header("Authorization", bearer(owner)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"installment\":" + installment + ",\"extraAmount\":200}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.savedInstallments").isNumber())
                .andExpect(jsonPath("$.interestSaved").isNumber())
                .andExpect(jsonPath("$.schedule[0].extraPayment").value(200));
        mvc.perform(post("/api/v1/credits/{id}/amortization/scenarios", id)
                        .header("Authorization", bearer(owner)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"installment\":" + installment + ",\"extraAmount\":200,\"strategy\":\"REDUCE_PAYMENT\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.strategy").value("REDUCE_PAYMENT"))
                .andExpect(jsonPath("$.savedInstallments").value(0))
                .andExpect(jsonPath("$.monthlyPaymentAfterExtra").isNumber());
        mvc.perform(post("/api/v1/credits/{id}/amortization/scenarios", id)
                        .header("Authorization", bearer(owner)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"installment\":" + installment + ",\"extraAmount\":0.001}"))
                .andExpect(status().isBadRequest());
        org.assertj.core.api.Assertions.assertThat(payments.findByCreditIdOrderByPaymentDateAsc(id)).hasSize(1);
        mvc.perform(get("/api/v1/credits/{id}/amortization", id)
                        .header("Authorization", bearer(other))).andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/credits/{id}/amortization/scenarios", id)
                        .header("Authorization", bearer(other)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"installment\":" + installment + ",\"extraAmount\":200}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void importsEditsAndDeletesOnlyUnlinkedCreditsWithoutFabricatingPastDueAmounts() throws Exception {
        User owner = user(); User other = user();
        java.util.Map<String, Object> request = new java.util.HashMap<>();
        request.put("name", "Hipoteca existente"); request.put("principal", 100000);
        request.put("annualRate", 12); request.put("termMonths", 60); request.put("paymentDay", 15);
        request.put("currency", "COP"); request.put("disbursementDate", LocalDate.now().minusYears(2).toString());
        request.put("openingBalance", 60000); request.put("openingDate", LocalDate.now().minusDays(1).toString());
        request.put("openingRemainingMonths", 36); request.put("openingNextPaymentDate", LocalDate.now().plusDays(10).toString());
        String created = mvc.perform(post("/api/v1/credits").header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(request)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.remainingBalance").value(60000))
                .andExpect(jsonPath("$.status").value("ACTIVE")).andExpect(jsonPath("$.overdueAmount").value(0))
                .andExpect(jsonPath("$.paidPrincipal").value(0)).andExpect(jsonPath("$.editable").value(true))
                .andExpect(jsonPath("$.disbursementLinked").value(false)).andReturn().getResponse().getContentAsString();
        long id = mapper.readTree(created).path("id").asLong();
        mvc.perform(get("/api/v1/credits/{id}/amortization", id).header("Authorization", bearer(owner)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.currentBalance").value(60000))
                .andExpect(jsonPath("$.payments.length()").value(0))
                .andExpect(jsonPath("$.projectedSchedule[0].installment").value(25));
        mvc.perform(get("/api/v1/credits/{id}/plan-vs-real", id).header("Authorization", bearer(owner)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("AL_DIA"));
        request.put("version", mapper.readTree(created).path("version").asLong());
        request.put("openingBalance", 55000);
        mvc.perform(put("/api/v1/credits/{id}", id).header("Authorization", bearer(other))
                        .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
        mvc.perform(put("/api/v1/credits/{id}", id).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(request)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.remainingBalance").value(55000));
        mvc.perform(put("/api/v1/credits/{id}", id).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
        mvc.perform(delete("/api/v1/credits/{id}", id).header("Authorization", bearer(other)))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/credits/{id}", id).header("Authorization", bearer(owner)))
                .andExpect(status().isNoContent());
        org.assertj.core.api.Assertions.assertThat(credits.findById(id)).isEmpty();
    }

    @Test
    void protectsImportedPaymentHistoryAndRejectsDoubleCountingBeforeTheCutoff() throws Exception {
        User owner = user();
        Credit credit = new Credit(); credit.setUser(owner); credit.setName("Casa");
        credit.setPrincipal(new BigDecimal("1000")); credit.setAnnualRate(new BigDecimal("12"));
        credit.setTermMonths(24); credit.setDisbursementDate(LocalDate.now().minusYears(1));
        credit.setPaymentDay(15); credit.setCurrency("COP"); credit.setOpeningBalance(new BigDecimal("500"));
        credit.setOpeningDate(LocalDate.now().minusDays(1)); credit.setOpeningRemainingMonths(12);
        credit.setOpeningNextPaymentDate(LocalDate.now().plusDays(10)); credit = credits.saveAndFlush(credit);
        long id = credit.getId();
        mvc.perform(post("/api/v1/credits/{id}/payments", id).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"amount\":50,\"paymentDate\":\"" + credit.getOpeningDate() + "\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/credits/{id}/payments", id).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"amount\":50,\"paymentDate\":\"" + LocalDate.now() + "\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/credits/{id}", id).header("Authorization", bearer(owner)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.editable").value(false))
                .andExpect(jsonPath("$.deletable").value(false));
        mvc.perform(delete("/api/v1/credits/{id}", id).header("Authorization", bearer(owner)))
                .andExpect(status().isBadRequest());
        org.assertj.core.api.Assertions.assertThat(payments.findByCreditIdOrderByPaymentDateAsc(id)).hasSize(1);
    }
    private User user() {
        Role role = roles.findByName("USER").orElseGet(() -> roles.save(new Role(null, "USER")));
        User user = new User(); user.setName("Credit test"); user.setEmail("credit-" + UUID.randomUUID() + "@test.local"); user.setPassword(encoder.encode("password")); user.setRoles(java.util.Set.of(role));
        return users.save(user);
    }
    private String bearer(User user) { return "Bearer " + jwt.generateToken(user.getEmail()); }
}
