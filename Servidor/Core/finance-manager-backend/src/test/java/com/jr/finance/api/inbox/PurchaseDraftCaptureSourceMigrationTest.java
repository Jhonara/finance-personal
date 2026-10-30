package com.jr.finance.api.inbox;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;

import java.sql.DriverManager;
import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PurchaseDraftCaptureSourceMigrationTest {
    @Test
    void migrationAcceptsAllCaptureSourcesAndStillRejectsUnknownOnes() throws Exception {
        try (var connection = DriverManager.getConnection("jdbc:h2:mem:capture_sources;MODE=PostgreSQL")) {
            try (var statement = connection.createStatement()) {
                statement.execute("CREATE TABLE purchase_drafts (source VARCHAR(16) NOT NULL, " +
                        "CONSTRAINT ck_purchase_draft_source CHECK (source IN " +
                        "('PASTED_TEXT', 'SHORTCUT', 'APP_INTENT', 'WALLET')))");
            }
            ScriptUtils.executeSqlScript(connection,
                    new ClassPathResource("db/migration/V22__purchase_draft_capture_sources.sql"));
            try (var statement = connection.createStatement()) {
                for (var source : InboxDtos.Source.values())
                    statement.executeUpdate("INSERT INTO purchase_drafts (source) VALUES ('" + source.name() + "')");
                assertThatThrownBy(() -> statement.executeUpdate(
                        "INSERT INTO purchase_drafts (source) VALUES ('UNKNOWN')"))
                        .isInstanceOf(SQLException.class);
            }
        }
    }
}
