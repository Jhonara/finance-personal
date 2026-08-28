package com.jr.finance.api;

import com.jr.finance.api.common.exception.BadRequestException;
import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.saving.SavingGoal;
import com.jr.finance.api.saving.SavingGoalRepository;
import com.jr.finance.api.saving.SavingMovementRepository;
import com.jr.finance.api.saving.SavingService;
import com.jr.finance.api.saving.dto.AddSavingMovementRequest;
import com.jr.finance.api.user.User;
import com.jr.finance.api.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
class PostgreSqlSchemaIntegrationTests {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("finance_test")
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
        registry.add("jwt.secret", () -> "postgres-test-jwt-secret-for-isolated-tests-only");
        registry.add("cors.allowed-origins", () -> "http://localhost");
    }

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private SavingService savingService;

    @Autowired
    private SavingGoalRepository savingGoalRepository;

    @Autowired
    private SavingMovementRepository savingMovementRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    void appliesAllMigrationsAndValidatesTheJpaSchema() {
        List<Map<String, Object>> migrations = jdbcTemplate.queryForList("""
                select version, description, checksum, success
                from flyway_schema_history
                where version is not null
                order by installed_rank
                """);

        assertThat(migrations)
                .hasSize(3)
                .allSatisfy(migration -> {
                    assertThat(migration.get("checksum")).isNotNull();
                    assertThat(migration.get("success")).isEqualTo(true);
                });
        assertThat(migrations)
                .extracting(migration -> migration.get("version"))
                .containsExactly("1", "2", "3");
        assertThat(migrations)
                .extracting(migration -> migration.get("description"))
                .containsExactly("legacy schema baseline", "reconcile jpa schema constraints and indexes",
                        "add saving goal optimistic lock");
    }

    @Test
    void enforcesOwnershipUniquenessForeignKeysAndPositiveAmounts() {
        String email = "flyway-" + UUID.randomUUID() + "@test.local";
        Long userId = jdbcTemplate.queryForObject(
                "insert into users (name, email, password) values (?, ?, ?) returning id",
                Long.class, "Flyway Test", email, "not-a-real-password");

        jdbcTemplate.update("insert into categories (name, user_id) values (?, ?)", "Food", userId);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "insert into categories (name, user_id) values (?, ?)", "Food", userId))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "insert into incomes (user_id, amount, income_date) values (?, ?, current_date)",
                userId, -1))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "insert into expenses (user_id, amount, expense_date) values (?, ?, current_date)",
                Long.MAX_VALUE, 1))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "insert into categories (name, user_id) values (?, ?)", "Orphan", null))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);

        assertThatThrownBy(() -> jdbcTemplate.update("""
                insert into credits (user_id, name, amount, interest_rate, installments, start_date, payment_day)
                values (?, ?, ?, ?, ?, current_date, ?)
                """, userId, "Invalid payment day", 100, 1, 12, 32))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }

    @Test
    void createsTheExpectedPostgreSqlSchemaAndAlertUniquenessRules() {
        List<String> expectedTables = List.of(
                "users", "roles", "categories", "incomes", "expenses", "saving_goals",
                "saving_movements", "credits", "credit_payments", "user_alerts_seen");

        Integer tablesFound = jdbcTemplate.queryForObject("""
                select count(*) from information_schema.tables
                where table_schema = 'public' and table_name in
                ('users', 'roles', 'categories', 'incomes', 'expenses', 'saving_goals',
                 'saving_movements', 'credits', 'credit_payments', 'user_alerts_seen')
                """, Integer.class);
        assertThat(tablesFound).isEqualTo(expectedTables.size());

        assertNumericColumn("incomes", "amount", 19, 4);
        assertNumericColumn("expenses", "amount", 19, 4);
        assertNumericColumn("saving_goals", "target_amount", 19, 4);
        assertNumericColumn("saving_goals", "current_amount", 19, 4);
        assertThat(jdbcTemplate.queryForObject("""
                select is_nullable = 'NO' and column_default = '0'
                from information_schema.columns
                where table_schema = 'public' and table_name = 'saving_goals' and column_name = 'version'
                """, Boolean.class)).isTrue();
        assertNumericColumn("saving_movements", "amount", 19, 4);
        assertNumericColumn("credits", "amount", 19, 4);
        assertNumericColumn("credits", "interest_rate", 9, 6);
        assertNumericColumn("credit_payments", "amount", 19, 4);
        assertNumericColumn("credit_payments", "extra_payment", 19, 4);

        Integer foreignKeys = jdbcTemplate.queryForObject("""
                select count(*) from information_schema.table_constraints
                where table_schema = 'public' and constraint_type = 'FOREIGN KEY'
                """, Integer.class);
        assertThat(foreignKeys).isGreaterThanOrEqualTo(10);
        assertThat(jdbcTemplate.queryForObject("select pg_get_serial_sequence('users', 'id') is not null", Boolean.class))
                .isTrue();
        assertIndexes("idx_expenses_user_expense_date", "idx_incomes_user_income_date",
                "idx_credits_user_id", "idx_credit_payments_credit_payment_date",
                "idx_saving_goals_user_id", "idx_saving_movements_goal_movement_date",
                "uk_user_alert_seen_without_related");

        Long userId = jdbcTemplate.queryForObject(
                "insert into users (name, email, password) values (?, ?, ?) returning id",
                Long.class, "Alert Test", "alerts-" + UUID.randomUUID() + "@test.local", "not-a-real-password");

        jdbcTemplate.update("insert into user_alerts_seen (user_id, alert_code) values (?, ?)", userId, "GLOBAL");
        assertThatThrownBy(() -> jdbcTemplate.update(
                "insert into user_alerts_seen (user_id, alert_code) values (?, ?)", userId, "GLOBAL"))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);

        jdbcTemplate.update("insert into user_alerts_seen (user_id, alert_code, related_id) values (?, ?, ?)",
                userId, "RELATED", 1L);
        assertThatThrownBy(() -> jdbcTemplate.update(
                "insert into user_alerts_seen (user_id, alert_code, related_id) values (?, ?, ?)", userId, "RELATED", 1L))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }

    @Test
    void savingContributionIsAtomicAndCurrentAmountMatchesItsMovements() {
        User user = createUser();
        SavingGoal goal = createGoal(user, "Atomic", "1000.0000");

        SavingGoal updated = savingService.addMovement(user.getId(), goal.getId(), movement("125.5000", LocalDate.now()));

        assertThat(updated.getCurrentAmount()).isEqualByComparingTo("125.5000");
        assertMaterializedAmountMatchesMovements(goal.getId());

        assertThatThrownBy(() -> savingService.addMovement(user.getId(), goal.getId(), movement("10.0000", null)))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);

        assertMaterializedAmountMatchesMovements(goal.getId());
        assertThat(savingMovementRepository.findBySavingGoalId(goal.getId())).hasSize(1);
    }

    @Test
    void savingContributionRejectsForeignOwnerAndInvalidAmount() {
        User owner = createUser();
        User otherUser = createUser();
        SavingGoal goal = createGoal(owner, "Private", "1000.0000");

        assertThatThrownBy(() -> savingService.addMovement(otherUser.getId(), goal.getId(), movement("1.0000", LocalDate.now())))
                .isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> savingService.addMovement(owner.getId(), goal.getId(), movement("0.0000", LocalDate.now())))
                .isInstanceOf(BadRequestException.class);

        assertMaterializedAmountMatchesMovements(goal.getId());
    }

    @Test
    void materializedSavingAmountDivergenceIsDetectedAgainstMovements() {
        User user = createUser();
        SavingGoal goal = createGoal(user, "Invariant", "1000.0000");
        savingService.addMovement(user.getId(), goal.getId(), movement("25.0000", LocalDate.now()));

        jdbcTemplate.update("update saving_goals set current_amount = ? where id = ?", new BigDecimal("30.0000"), goal.getId());

        assertThatThrownBy(() -> assertMaterializedAmountMatchesMovements(goal.getId()))
                .isInstanceOf(AssertionError.class);
    }

    @Test
    void optimisticVersionRejectsOneOfTwoStalePostgreSqlUpdates() throws Exception {
        SavingGoal goal = createGoal(createUser(), "Concurrent", "1000.0000");
        CyclicBarrier loaded = new CyclicBarrier(2);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            Future<Boolean> first = executor.submit(() -> updateStaleGoal(goal.getId(), loaded));
            Future<Boolean> second = executor.submit(() -> updateStaleGoal(goal.getId(), loaded));

            assertThat(first.get()).isNotEqualTo(second.get());
        } finally {
            executor.shutdownNow();
        }

        SavingGoal reloaded = savingGoalRepository.findById(goal.getId()).orElseThrow();
        assertThat(reloaded.getCurrentAmount()).isEqualByComparingTo("10.0000");
        assertThat(reloaded.getVersion()).isEqualTo(1L);
    }

    private boolean updateStaleGoal(Long goalId, CyclicBarrier loaded) {
        try {
            new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                SavingGoal goal = savingGoalRepository.findById(goalId).orElseThrow();
                await(loaded);
                goal.setCurrentAmount(goal.getCurrentAmount().add(BigDecimal.TEN));
                savingGoalRepository.saveAndFlush(goal);
            });
            return true;
        } catch (ObjectOptimisticLockingFailureException ex) {
            return false;
        }
    }

    private void await(CyclicBarrier barrier) {
        try {
            barrier.await();
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo sincronizar la prueba de concurrencia", ex);
        }
    }

    private User createUser() {
        User user = new User();
        user.setName("Saving Test");
        user.setEmail("saving-" + UUID.randomUUID() + "@test.local");
        user.setPassword("not-a-real-password");
        return userRepository.saveAndFlush(user);
    }

    private SavingGoal createGoal(User user, String name, String targetAmount) {
        SavingGoal goal = new SavingGoal();
        goal.setUser(user);
        goal.setName(name);
        goal.setTargetAmount(new BigDecimal(targetAmount));
        goal.setCurrentAmount(BigDecimal.ZERO.setScale(4));
        goal.setCompleted(false);
        return savingGoalRepository.saveAndFlush(goal);
    }

    private AddSavingMovementRequest movement(String amount, LocalDate date) {
        AddSavingMovementRequest request = new AddSavingMovementRequest();
        request.setAmount(new BigDecimal(amount));
        request.setMovementDate(date);
        return request;
    }

    private void assertMaterializedAmountMatchesMovements(Long goalId) {
        BigDecimal materialized = savingGoalRepository.findById(goalId).orElseThrow().getCurrentAmount();
        BigDecimal movementsTotal = savingMovementRepository.findBySavingGoalId(goalId).stream()
                .map(movement -> movement.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(materialized).isEqualByComparingTo(movementsTotal);
    }

    private void assertNumericColumn(String table, String column, int precision, int scale) {
        Map<String, Object> metadata = jdbcTemplate.queryForMap("""
                select data_type, numeric_precision, numeric_scale, is_nullable
                from information_schema.columns
                where table_schema = 'public' and table_name = ? and column_name = ?
                """, table, column);

        assertThat(metadata.get("data_type")).isEqualTo("numeric");
        assertThat(((Number) metadata.get("numeric_precision")).intValue()).isEqualTo(precision);
        assertThat(((Number) metadata.get("numeric_scale")).intValue()).isEqualTo(scale);
    }

    private void assertIndexes(String... expectedIndexNames) {
        List<String> indexes = jdbcTemplate.queryForList("""
                select indexname from pg_indexes
                where schemaname = 'public'
                """, String.class);

        assertThat(indexes).contains(expectedIndexNames);
    }
}
