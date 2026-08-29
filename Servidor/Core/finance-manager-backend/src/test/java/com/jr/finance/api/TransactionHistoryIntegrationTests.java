package com.jr.finance.api;

import com.jr.finance.api.account.*;
import com.jr.finance.api.auth.JwtService;
import com.jr.finance.api.expense.*;
import com.jr.finance.api.ledger.*;
import com.jr.finance.api.transfer.TransferService;
import com.jr.finance.api.transfer.dto.CreateTransferRequest;
import com.jr.finance.api.user.*;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TransactionHistoryIntegrationTests {
    @Autowired MockMvc mvc; @Autowired JwtService jwt; @Autowired PasswordEncoder encoder;
    @Autowired UserRepository users; @Autowired RoleRepository roles; @Autowired AccountRepository accounts;
    @Autowired CategoryRepository categories; @Autowired FinancialTransactionRepository transactions;
    @Autowired LedgerEntryRepository entries; @Autowired LedgerService ledger; @Autowired TransferService transfers;

    @BeforeEach void clean() { entries.deleteAll(); transactions.deleteAll(); categories.deleteAll(); accounts.deleteAll(); users.deleteAll(); roles.deleteAll(); }

    @Test void paginatesFiltersAndKeepsTransfersAsOneLogicalRow() throws Exception {
        User user = user(); Account source = account(user, "Source"); Account destination = account(user, "Destination"); Category food = category(user, "Food");
        ledger.recordIncome(user.getId(), source.getId(), command("100", LocalDate.of(2026, 8, 1), null));
        ledger.recordExpense(user.getId(), source.getId(), command("20", LocalDate.of(2026, 8, 2), food.getId()));
        CreateTransferRequest transfer = new CreateTransferRequest(); transfer.setSourceAccountId(source.getId()); transfer.setDestinationAccountId(destination.getId()); transfer.setAmount(new BigDecimal("30")); transfer.setEffectiveDate(LocalDate.of(2026, 8, 3)); transfer.setDescription("Move"); transfers.create(user.getId(), transfer);

        mvc.perform(get("/api/v1/transactions?year=2026&month=8&page=0&size=2").header("Authorization", bearer(user)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.totalElements").value(3)).andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.content[0].type").value("TRANSFER"))
                .andExpect(jsonPath("$.content[0].sourceAccountId").value(source.getId()))
                .andExpect(jsonPath("$.content[0].destinationAccountId").value(destination.getId()));
        mvc.perform(get("/api/v1/transactions?categoryId=" + food.getId()).header("Authorization", bearer(user)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].type").value("EXPENSE"));
        mvc.perform(get("/api/v1/transactions?accountId=" + destination.getId()).header("Authorization", bearer(user)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test void validatesPageAndDoesNotRevealForeignFilterValues() throws Exception {
        User owner = user(); User other = user(); Account foreign = account(other, "Foreign");
        mvc.perform(get("/api/v1/transactions?page=-1").header("Authorization", bearer(owner)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mvc.perform(get("/api/v1/transactions?size=101").header("Authorization", bearer(owner))).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/transactions?accountId=" + foreign.getId()).header("Authorization", bearer(owner))).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/transactions?year=2026&month=8&from=2026-08-01").header("Authorization", bearer(owner))).andExpect(status().isBadRequest());
    }

    private User user() { Role role=roles.findByName("USER").orElseGet(() -> { Role r=new Role(); r.setName("USER"); return roles.save(r); }); User u=new User(); u.setName("Test"); u.setEmail(UUID.randomUUID()+"@test.local"); u.setPassword(encoder.encode("password123")); u.getRoles().add(role); return users.save(u); }
    private Account account(User u, String name) { Account a=new Account(); a.setUser(u); a.setName(name); a.setType(AccountType.BANK); a.setCurrency("COP"); a.setActive(true); return accounts.save(a); }
    private Category category(User u, String name) { Category c=new Category(); c.setUser(u); c.setName(name); return categories.save(c); }
    private FinancialOperationCommand command(String amount, LocalDate date, Long categoryId) { return new FinancialOperationCommand(new BigDecimal(amount), date, "test", "COP", categoryId); }
    private String bearer(User u) { return "Bearer " + jwt.generateToken(u.getEmail()); }
}
