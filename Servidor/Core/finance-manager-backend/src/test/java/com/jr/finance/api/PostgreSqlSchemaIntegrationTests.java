package com.jr.finance.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Map;
import java.util.UUID;

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

    @Test
    void appliesAllMigrationsAndValidatesTheJpaSchema() {
        List<Map<String, Object>> migrations = jdbcTemplate.queryForList("""
                select version, description, checksum, success
                from flyway_schema_history
                where version is not null
                order by installed_rank
                """);

        assertThat(migrations)
                .hasSize(2)
                .allSatisfy(migration -> {
                    assertThat(migration.get("checksum")).isNotNull();
                    assertThat(migration.get("success")).isEqualTo(true);
                });
        assertThat(migrations)
                .extracting(migration -> migration.get("version"))
                .containsExactly("1", "2");
        assertThat(migrations)
                .extracting(migration -> migration.get("description"))
                .containsExactly("legacy schema baseline", "reconcile jpa schema constraints and indexes");
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
