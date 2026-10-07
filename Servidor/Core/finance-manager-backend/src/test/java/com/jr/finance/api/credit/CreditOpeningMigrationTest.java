package com.jr.finance.api.credit;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import java.sql.DriverManager;
import static org.assertj.core.api.Assertions.*;

class CreditOpeningMigrationTest {
    @Test
    void preservesLegacyBalancesAndRejectsPartialOpeningPositions() throws Exception {
        try (var connection = DriverManager.getConnection("jdbc:h2:mem:opening_migration;MODE=PostgreSQL")) {
            var statement = connection.createStatement();
            statement.execute("CREATE TABLE credits (id BIGINT PRIMARY KEY, amount NUMERIC(19,4), installments INTEGER, start_date DATE)");
            statement.execute("INSERT INTO credits VALUES (1, 1000, 12, DATE '2025-01-01')");
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/migration/V14__credit_opening_position.sql"));
            try (var row = statement.executeQuery("SELECT amount, opening_balance FROM credits WHERE id = 1")) {
                assertThat(row.next()).isTrue();
                assertThat(row.getBigDecimal(1)).isEqualByComparingTo("1000");
                assertThat(row.getBigDecimal(2)).isNull();
            }
            assertThatThrownBy(() -> statement.execute("UPDATE credits SET opening_balance = 500 WHERE id = 1"))
                    .isInstanceOf(java.sql.SQLException.class);
            statement.execute("UPDATE credits SET opening_balance = 500, opening_date = DATE '2026-01-01', opening_remaining_months = 6, opening_next_payment_date = DATE '2026-01-15' WHERE id = 1");
        }
    }
}
