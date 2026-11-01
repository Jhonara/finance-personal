package com.jr.finance.api;

import com.jr.finance.api.account.*;
import com.jr.finance.api.auth.JwtService;
import com.jr.finance.api.ledger.*;
import com.jr.finance.api.transfer.TransferService;
import com.jr.finance.api.transfer.dto.CreateTransferRequest;
import com.jr.finance.api.user.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class TransactionReversalIntegrationTests {
    @Autowired MockMvc mvc; @Autowired JwtService jwt; @Autowired UserRepository users;
    @Autowired AccountRepository accounts; @Autowired LedgerService ledger;
    @Autowired FinancialTransactionRepository transactions; @Autowired LedgerEntryRepository entries;
    @Autowired TransferService transfers;

    @Test void reversesExpenseOnceWithReasonAndBidirectionalTrace() throws Exception {
        var u = user(); var a = account(u); var original = ledger.recordExpense(u.getId(), a.getId(), command("30"));
        mvc.perform(post("/api/v1/transactions/" + original.getId() + "/reversal").header("Authorization", bearer(u))
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"  Duplicado  \"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.type").value("REVERSAL"))
                .andExpect(jsonPath("$.originalType").value("EXPENSE"))
                .andExpect(jsonPath("$.reversalOfId").value(original.getId()))
                .andExpect(jsonPath("$.reversalReason").value("Duplicado"))
                .andExpect(jsonPath("$.effectiveDate").value(LocalDate.now().toString()))
                .andExpect(jsonPath("$.reversible").value(false));
        mvc.perform(get("/api/v1/transactions/" + original.getId()).header("Authorization", bearer(u)))
                .andExpect(jsonPath("$.status").value("REVERSED"))
                .andExpect(jsonPath("$.reversalId").isNumber()).andExpect(jsonPath("$.reversible").value(false));
        mvc.perform(post("/api/v1/transactions/" + original.getId() + "/reversal").header("Authorization", bearer(u)))
                .andExpect(status().isConflict());
        assertThat(entries.findAllByFinancialTransactionId(original.getId())).hasSize(1);
        assertThat(ledger.getAccountBalance(u.getId(), a.getId())).isEqualByComparingTo("0");
    }

    @Test void rejectsForeignInvalidReasonAndOperationsManagedElsewhere() throws Exception {
        var u = user(); var other = user(); var a = account(u);
        var original = ledger.recordIncome(u.getId(), a.getId(), command("100"));
        mvc.perform(post("/api/v1/transactions/" + original.getId() + "/reversal").header("Authorization", bearer(other)))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/transactions/" + original.getId() + "/reversal").header("Authorization", bearer(u))
                .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"" + "a".repeat(256) + "\"}"))
                .andExpect(status().isBadRequest());
        var opening = ledger.recordOpeningBalance(u.getId(), a.getId(), command("10"));
        mvc.perform(post("/api/v1/transactions/" + opening.getId() + "/reversal").header("Authorization", bearer(u)))
                .andExpect(status().isBadRequest());
        assertThat(ledger.getAccountBalance(u.getId(), a.getId())).isEqualByComparingTo("110");
    }

    @Test void rejectsIncomeReversalAfterSpendingAndAllowsItOnceFunded() throws Exception {
        var u = user(); var a = account(u); var original = ledger.recordIncome(u.getId(), a.getId(), command("100"));
        ledger.recordExpense(u.getId(), a.getId(), command("60"));
        mvc.perform(post("/api/v1/transactions/" + original.getId() + "/reversal").header("Authorization", bearer(u)))
                .andExpect(status().isConflict());
        assertThat(transactions.findById(original.getId()).orElseThrow().getStatus()).isEqualTo(FinancialTransactionStatus.POSTED);
        ledger.recordIncome(u.getId(), a.getId(), command("60"));
        mvc.perform(post("/api/v1/transactions/" + original.getId() + "/reversal").header("Authorization", bearer(u)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.originalType").value("INCOME"));
        assertThat(ledger.getAccountBalance(u.getId(), a.getId())).isEqualByComparingTo("0");
    }

    @Test void transferReversalPreservesOneLogicalRowAndActualReturnRoute() throws Exception {
        var u = user(); var a = account(u); var b = account(u);
        ledger.recordIncome(u.getId(), a.getId(), command("100"));
        var request = new CreateTransferRequest(); request.setSourceAccountId(a.getId()); request.setDestinationAccountId(b.getId());
        request.setAmount(new BigDecimal("40")); request.setEffectiveDate(LocalDate.now());
        var transfer = transfers.create(u.getId(), request);
        mvc.perform(post("/api/v1/transactions/" + transfer.getId() + "/reversal").header("Authorization", bearer(u)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.originalType").value("TRANSFER"))
                .andExpect(jsonPath("$.sourceAccountId").value(b.getId()))
                .andExpect(jsonPath("$.destinationAccountId").value(a.getId()));
        assertThat(ledger.getAccountBalance(u.getId(), a.getId())).isEqualByComparingTo("100");
        assertThat(ledger.getAccountBalance(u.getId(), b.getId())).isEqualByComparingTo("0");
    }

    private User user() { var u = new User(); u.setName("Reversal QA"); u.setEmail(UUID.randomUUID() + "@test.local"); u.setPassword("unused"); return users.save(u); }
    private Account account(User u) { var a = new Account(); a.setUser(u); a.setName(UUID.randomUUID().toString()); a.setType(AccountType.BANK); a.setCurrency("COP"); a.setActive(true); return accounts.save(a); }
    private FinancialOperationCommand command(String amount) { return new FinancialOperationCommand(new BigDecimal(amount), LocalDate.now().minusMonths(1), "QA", "COP", null); }
    private String bearer(User u) { return "Bearer " + jwt.generateToken(u.getEmail()); }
}
