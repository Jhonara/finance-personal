package com.jr.finance.api;

import com.jr.finance.api.common.exception.*;
import com.jr.finance.api.saving.*;
import com.jr.finance.api.saving.dto.*;
import com.jr.finance.api.user.*;
import com.jr.finance.api.ledger.LedgerEntryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest @ActiveProfiles("test") @Transactional
class SavingsAdministrationIntegrationTests {
    @Autowired SavingService service; @Autowired UserRepository users;
    @Autowired SavingGoalRepository goals; @Autowired SavingMovementRepository movements;
    @Autowired LedgerEntryRepository ledger;
    @Autowired com.jr.finance.api.dashboard.DashboardService dashboard;

    @Test void editsMetadataAndTargetWithoutChangingHistoryCurrencyOrLedger() {
        var u = user(); var goal = goal(u); long ledgerBefore = ledger.count();
        service.addMovement(u.getId(), goal.getId(), movement("40", goal.getVersion(), "first"));
        var updated = service.update(u.getId(), goal.getId(), new UpdateSavingGoalRequest("Nueva meta", "Descripción", new BigDecimal("40"), LocalDate.of(2027, 1, 1), goal.getVersion()));
        assertThat(updated.isCompleted()).isTrue(); assertThat(updated.getCurrency()).isEqualTo("COP");
        assertThat(updated.getDescription()).isEqualTo("Descripción");
        assertThat(service.movements(u.getId(), goal.getId())).hasSize(1);
        assertThat(ledger.count()).isEqualTo(ledgerBefore);
    }

    @Test void recordsWithdrawalsAndRejectsOverdraftDuplicateRequestsAndStaleVersions() {
        var u = user(); var goal = goal(u); long before = ledger.count();
        var deposit = movement("80", goal.getVersion(), "deposit");
        service.addMovement(u.getId(), goal.getId(), deposit);
        service.addMovement(u.getId(), goal.getId(), deposit);
        assertThat(service.movements(u.getId(), goal.getId())).hasSize(1);
        var withdrawal = movement("30", goal.getVersion(), "withdraw");
        service.withdraw(u.getId(), goal.getId(), withdrawal);
        assertThat(goal.getCurrentAmount()).isEqualByComparingTo("50");
        assertThat(service.movements(u.getId(), goal.getId())).hasSize(2);
        assertThat(service.movements(u.getId(), goal.getId()).getFirst().type()).isEqualTo(SavingMovementType.WITHDRAWAL);
        assertThatThrownBy(() -> service.withdraw(u.getId(), goal.getId(), movement("51", goal.getVersion(), "too-much"))).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.withdraw(u.getId(), goal.getId(), movement("1", 0L, "stale"))).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> service.addMovement(u.getId(), goal.getId(), movement("20", goal.getVersion(), "deposit"))).isInstanceOf(ConflictException.class);
        assertThat(goal.getCurrentAmount()).isEqualByComparingTo("50"); assertThat(ledger.count()).isEqualTo(before);
    }

    @Test void archivesAndReopensPreservingAllMovementsAndNeverDeletesFundedHistory() {
        var u = user(); var goal = goal(u);
        service.addMovement(u.getId(), goal.getId(), movement("20", goal.getVersion(), "deposit"));
        service.changeStatus(u.getId(), goal.getId(), new ChangeSavingStatusRequest(SavingGoalStatus.CLOSED, goal.getVersion()));
        assertThatThrownBy(() -> service.addMovement(u.getId(), goal.getId(), movement("1", goal.getVersion(), "closed"))).isInstanceOf(BadRequestException.class);
        service.withdraw(u.getId(), goal.getId(), movement("20", goal.getVersion(), "release"));
        assertThatThrownBy(() -> service.deleteEmpty(u.getId(), goal.getId(), goal.getVersion())).isInstanceOf(ConflictException.class);
        service.changeStatus(u.getId(), goal.getId(), new ChangeSavingStatusRequest(SavingGoalStatus.ACTIVE, goal.getVersion()));
        service.changeStatus(u.getId(), goal.getId(), new ChangeSavingStatusRequest(SavingGoalStatus.CANCELLED, goal.getVersion()));
        assertThat(service.movements(u.getId(), goal.getId())).hasSize(2);
        assertThat(goal.getStatus()).isEqualTo(SavingGoalStatus.CANCELLED);
    }

    @Test void deletesOnlyEmptyOwnedGoalAndProtectsOtherUsersAndLegacyRecords() {
        var u = user(); var other = user(); var goal = goal(u);
        assertThatThrownBy(() -> service.get(other.getId(), goal.getId())).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.movements(other.getId(), goal.getId())).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.deleteEmpty(other.getId(), goal.getId(), goal.getVersion())).isInstanceOf(NotFoundException.class);
        service.deleteEmpty(u.getId(), goal.getId(), goal.getVersion());
        assertThat(goals.findById(goal.getId())).isEmpty();
        var legacy = goal(u); legacy.setCurrency(null); goals.saveAndFlush(legacy);
        service.assignCurrency(u.getId(), legacy.getId(), "USD");
        assertThat(service.get(u.getId(), legacy.getId()).getCurrency()).isEqualTo("USD");
    }

    @Test void dashboardShowsOnlyActiveGoalsWhileAdministrationKeepsArchivedHistory() {
        var u = user(); var active = goal(u); var archived = goal(u);
        service.changeStatus(u.getId(), archived.getId(), new ChangeSavingStatusRequest(SavingGoalStatus.CLOSED, archived.getVersion()));
        assertThat(service.listGoals(u.getId())).hasSize(2);
        assertThat(dashboard.getMonthDashboard(u.getId(), 2026, 10).getSavings()).singleElement()
                .satisfies(item -> assertThat(item.getId()).isEqualTo(active.getId()));
    }

    private User user() { var u = new User(); u.setName("Savings QA"); u.setEmail(UUID.randomUUID() + "@test.local"); u.setPassword("unused"); return users.save(u); }
    private SavingGoal goal(User u) { var r = new CreateSavingGoalRequest(); r.setName("Meta QA"); r.setCurrency("COP"); r.setTargetAmount(new BigDecimal("100")); return service.createGoal(u.getId(), r); }
    private AddSavingMovementRequest movement(String amount, Long version, String key) { var r = new AddSavingMovementRequest(); r.setAmount(new BigDecimal(amount)); r.setMovementDate(LocalDate.now()); r.setVersion(version); r.setRequestId(key); return r; }
}
