package com.jr.finance.api;

import com.jr.finance.api.account.*;
import com.jr.finance.api.auth.JwtService;
import com.jr.finance.api.expense.*;
import com.jr.finance.api.ledger.*;
import com.jr.finance.api.transfer.TransferService;
import com.jr.finance.api.transfer.dto.CreateTransferRequest;
import com.jr.finance.api.user.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.nio.file.*;
import java.util.UUID;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:transaction_search;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc @ActiveProfiles("test")
class TransactionSearchIntegrationTest {
    @Autowired MockMvc mvc; @Autowired JwtService jwt;
    @Autowired UserRepository users; @Autowired RoleRepository roles;
    @Autowired AccountRepository accounts; @Autowired CategoryRepository categories;
    @Autowired LedgerService ledger; @Autowired TransferService transfers;
    User owner; Account bank; Category category;
    final LocalDate date = LocalDate.of(2026, 8, 10);

    @BeforeEach void setup() {
        owner = user(); bank = account(owner, "Banco principal");
        category = new Category(); category.setUser(owner); category.setName("Alimentación");
        category.setType(CategoryType.EXPENSE); category = categories.saveAndFlush(category);
    }
    @Test void searchesBeforePagingCombinesFiltersAndNeverExposesAnotherOwner() throws Exception {
        for (int i = 0; i < 25; i++) ledger.recordExpense(owner.getId(), bank.getId(), command("Mercado semanal " + i, category.getId()));
        ledger.recordIncome(owner.getId(), bank.getId(), command("Mercado reintegro", null));
        User other = user(); Account otherBank = account(other, "Banco principal");
        ledger.recordExpense(other.getId(), otherBank.getId(), command("Mercado privado", null));
        for (int page = 0; page < 2; page++) {
            mvc.perform(get("/api/v1/transactions").header("Authorization", bearer(owner))
                    .param("q", "  MERCADO banco  ").param("year", "2026").param("month", "8")
                    .param("type", "EXPENSE").param("status", "POSTED")
                    .param("categoryId", category.getId().toString()).param("accountId", bank.getId().toString())
                    .param("page", String.valueOf(page)).param("size", "20"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(25))
                    .andExpect(jsonPath("$.content.length()").value(page == 0 ? 20 : 5))
                    .andExpect(jsonPath("$.page").value(page));
        }
        mvc.perform(get("/api/v1/transactions").header("Authorization", bearer(owner)).param("q", "privado"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
    }
    @Test void ignoresCaseAndAccentsAndTreatsWildcardsAsLiteralText() throws Exception {
        ledger.recordIncome(owner.getId(), bank.getId(), command("Pago de NÓMINA", null));
        ledger.recordExpense(owner.getId(), bank.getId(), command("Descuento 10%_especial\\", category.getId()));
        for (String text : new String[] { "nomina", "NÓMINA", "alimentacion", "10%_", "\\" }) {
            mvc.perform(get("/api/v1/transactions").header("Authorization", bearer(owner)).param("q", text))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        }
        mvc.perform(get("/api/v1/transactions").header("Authorization", bearer(owner)).param("q", "   "))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2));
        mvc.perform(get("/api/v1/transactions").header("Authorization", bearer(owner)).param("q", "a".repeat(121)))
                .andExpect(status().isBadRequest());
    }
    @Test void matchesBothTransferAccountsWithoutDuplicatingTheMovementAndFindsReversalContext() throws Exception {
        Account destination = account(owner, "Banco ahorro");
        ledger.recordIncome(owner.getId(), bank.getId(), command("Nómina", null));
        var transfer = new CreateTransferRequest(); transfer.setSourceAccountId(bank.getId());
        transfer.setDestinationAccountId(destination.getId()); transfer.setAmount(BigDecimal.ONE);
        transfer.setEffectiveDate(date); transfer.setDescription("Reserva"); transfers.create(owner.getId(), transfer);
        for (String text : new String[] { "banco", "ahorro", "reserva" }) {
            mvc.perform(get("/api/v1/transactions").header("Authorization", bearer(owner))
                    .param("q", text).param("type", "TRANSFER"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        }
        var expense = ledger.recordExpense(owner.getId(), bank.getId(), command("Compra original", category.getId()));
        ledger.reverseTransaction(expense.getId(), owner.getId());
        mvc.perform(get("/api/v1/transactions").header("Authorization", bearer(owner))
                .param("q", "original alimentacion").param("type", "REVERSAL"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
    }
    @Test void requiresAuthenticationAndExportsTheSearchContract() throws Exception {
        mvc.perform(get("/api/v1/transactions").param("q", "mercado")).andExpect(status().isUnauthorized());
        String json = mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        Files.writeString(Path.of("target/search-openapi.json"), json);
    }
    private User user() {
        Role role = roles.findByName("USER").orElseGet(() -> { Role r = new Role(); r.setName("USER"); return roles.saveAndFlush(r); });
        User u = new User(); u.setName("Search test"); u.setEmail(UUID.randomUUID() + "@test.local");
        u.setPassword("unused"); u.getRoles().add(role); return users.saveAndFlush(u);
    }
    private Account account(User user, String name) {
        Account account = new Account(); account.setUser(user); account.setName(name);
        account.setType(AccountType.BANK); account.setCurrency("COP"); account.setActive(true); return accounts.saveAndFlush(account);
    }
    private FinancialOperationCommand command(String description, Long categoryId) {
        return new FinancialOperationCommand(new BigDecimal("100"), date, description, "COP", categoryId);
    }
    private String bearer(User user) { return "Bearer " + jwt.generateToken(user.getEmail()); }
}
