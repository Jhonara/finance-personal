package com.jr.finance.api.inbox;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import java.sql.DriverManager;
import static org.assertj.core.api.Assertions.*;

class NativeInboxMigrationTest {
    @Test void migrationPreservesExistingDraftsAndAddsNativeConstraints() throws Exception {
        try (var connection = DriverManager.getConnection("jdbc:h2:mem:native_migration;MODE=PostgreSQL")) {
            var statement = connection.createStatement();
            statement.execute("CREATE TABLE users (id BIGINT PRIMARY KEY)");
            statement.execute("CREATE TABLE accounts (id BIGINT PRIMARY KEY)");
            statement.execute("CREATE TABLE categories (id BIGINT PRIMARY KEY)");
            statement.execute("CREATE TABLE financial_transactions (id BIGINT PRIMARY KEY)");
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/migration/V19__purchase_review_inbox.sql"));
            // PostgreSQL names this inline CHECK deterministically; H2 auto-generates a different name.
            var constraints = statement.executeQuery("SELECT constraint_name FROM information_schema.table_constraints WHERE table_name='PURCHASE_DRAFTS' AND constraint_type='CHECK'");
            String statusConstraint = null;
            while (constraints.next()) {
                String name = constraints.getString(1);
                try (var check = connection.createStatement().executeQuery("SELECT check_clause FROM information_schema.check_constraints WHERE constraint_name='" + name + "'")) {
                    if (check.next() && check.getString(1).contains("STATUS")) statusConstraint = name;
                }
            }
            assertThat(statusConstraint).isNotNull();
            statement.execute("ALTER TABLE purchase_drafts RENAME CONSTRAINT " + statusConstraint + " TO purchase_drafts_status_check");
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/migration/V20__purchase_draft_source.sql"));
            statement.execute("INSERT INTO users VALUES (1)");
            statement.execute("INSERT INTO accounts VALUES (1)");
            statement.execute("INSERT INTO purchase_drafts (user_id, request_key, initial_fingerprint, kind, status, description, created_at) VALUES (1, 'original-request-0001', 'hash', 'EXPENSE', 'PENDING', 'Compra anterior', CURRENT_TIMESTAMP)");
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/migration/V21__native_purchase_intents.sql"));
            try (var row = statement.executeQuery("SELECT description, source, status FROM purchase_drafts")) {
                assertThat(row.next()).isTrue(); assertThat(row.getString(1)).isEqualTo("Compra anterior");
                assertThat(row.getString(2)).isEqualTo("PASTED_TEXT"); assertThat(row.getString(3)).isEqualTo("PENDING");
            }
            statement.execute("UPDATE purchase_drafts SET source='WALLET', status='DISCARDED'");
            assertThatThrownBy(() -> statement.execute("UPDATE purchase_drafts SET source='WALLET_VERIFIED'" )).isInstanceOf(java.sql.SQLException.class);
            statement.execute("INSERT INTO wallet_card_links (user_id, reference, name, kind, account_id) VALUES (1, 'alias', 'Visa', 'CREDIT', 1)");
            assertThatThrownBy(() -> statement.execute("INSERT INTO wallet_card_links (user_id, reference, name, kind, account_id) VALUES (1, 'alias', 'Visa', 'DEBIT', 1)")).isInstanceOf(java.sql.SQLException.class);
        }
    }
}
