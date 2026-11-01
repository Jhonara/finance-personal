package com.jr.finance.api;

import org.junit.jupiter.api.extension.AfterAllCallback;
import org.junit.jupiter.api.extension.BeforeAllCallback;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.testcontainers.containers.PostgreSQLContainer;

import java.net.URI;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.UUID;

/** A fresh database per test class, using Docker or an explicitly isolated local test cluster. */
final class PostgreSqlTestDatabase implements BeforeAllCallback, AfterAllCallback {
    private final String label;
    private PostgreSQLContainer<?> container;
    private String adminUrl;
    private String databaseName;
    private String jdbcUrl;
    private String username;
    private String password;

    PostgreSqlTestDatabase(String label) {
        this.label = label;
    }

    @Override
    public void beforeAll(ExtensionContext context) throws Exception {
        start();
    }

    private synchronized void start() throws SQLException {
        if (jdbcUrl != null) return;
        adminUrl = System.getProperty("finance.test.postgres.adminUrl");
        if (adminUrl == null || adminUrl.isBlank()) {
            container = new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("finance_" + label).withUsername("finance").withPassword("finance");
            container.start();
            username = container.getUsername();
            password = container.getPassword();
            jdbcUrl = container.getJdbcUrl();
            return;
        }

        if (!adminUrl.startsWith("jdbc:postgresql://")) {
            throw new IllegalArgumentException("The test cluster must use PostgreSQL");
        }
        URI uri = URI.create(adminUrl.substring("jdbc:".length()));
        username = System.getProperty("finance.test.postgres.username", "finance_test");
        password = System.getProperty("finance.test.postgres.password", "");
        if (!"127.0.0.1".equals(uri.getHost()) || uri.getPort() <= 0 || uri.getPort() == 5432
                || !"/postgres".equals(uri.getPath()) || uri.getUserInfo() != null
                || uri.getQuery() != null || !username.startsWith("finance_test")) {
            throw new IllegalArgumentException("Use a dedicated loopback test cluster on a non-default port and a finance_test role");
        }
        databaseName = "finance_test_" + label + "_" + UUID.randomUUID().toString().replace("-", "");
        try (var connection = DriverManager.getConnection(adminUrl, username, password);
             var statement = connection.createStatement()) {
            statement.execute("CREATE DATABASE \"" + databaseName + "\"");
        }
        jdbcUrl = "jdbc:postgresql://127.0.0.1:" + uri.getPort() + "/" + databaseName;
    }

    private void ensureStarted() {
        try {
            start();
        } catch (SQLException exception) {
            throw new IllegalStateException("Could not create the isolated PostgreSQL test database", exception);
        }
    }

    String getJdbcUrl() { ensureStarted(); return jdbcUrl; }
    String getUsername() { ensureStarted(); return username; }
    String getPassword() { ensureStarted(); return password; }
    String getDriverClassName() { return "org.postgresql.Driver"; }

    @Override
    public void afterAll(ExtensionContext context) throws Exception {
        if (container != null) {
            container.stop();
        } else if (jdbcUrl != null) {
            // Only the generated database is removed; the user's databases are never selected.
            try (var connection = DriverManager.getConnection(adminUrl, username, password);
                 var statement = connection.createStatement()) {
                statement.execute("DROP DATABASE \"" + databaseName + "\" WITH (FORCE)");
            }
        }
    }
}
