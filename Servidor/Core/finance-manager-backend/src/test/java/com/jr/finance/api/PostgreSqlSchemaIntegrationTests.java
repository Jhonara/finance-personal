package com.jr.finance.api;

import com.jr.finance.api.common.exception.BadRequestException;
import com.jr.finance.api.common.exception.NotFoundException;
import com.jr.finance.api.common.exception.ConflictException;
import com.jr.finance.api.budget.BudgetRepository;
import com.jr.finance.api.budget.BudgetService;
import com.jr.finance.api.budget.dto.CreateBudgetRequest;
import com.jr.finance.api.budget.Budget;
import com.jr.finance.api.account.Account;
import com.jr.finance.api.account.AccountRepository;
import com.jr.finance.api.account.AccountType;
import com.jr.finance.api.expense.Category;
import com.jr.finance.api.expense.CategoryRepository;
import com.jr.finance.api.ledger.FinancialOperationCommand;
import com.jr.finance.api.ledger.FinancialTransactionRepository;
import com.jr.finance.api.ledger.LedgerEntryRepository;
import com.jr.finance.api.ledger.LedgerService;
import com.jr.finance.api.ledger.LegacyLedgerMigrationService;
import com.jr.finance.api.income.Income;
import com.jr.finance.api.income.IncomeRepository;
import com.jr.finance.api.transfer.TransferService;
import com.jr.finance.api.transaction.TransactionQuery;
import com.jr.finance.api.transaction.TransactionService;
import com.jr.finance.api.transfer.dto.CreateTransferRequest;
import javax.sql.DataSource;
import jakarta.persistence.EntityManager;
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
import org.springframework.test.context.bean.override.mockito.MockReset;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;

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
    private AccountRepository accountRepository;

    @Autowired
    private LedgerService ledgerService;

    @Autowired
    private FinancialTransactionRepository financialTransactionRepository;

    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired private LegacyLedgerMigrationService legacyMigrationService;
    @Autowired private IncomeRepository incomeRepository;
    @Autowired private DataSource dataSource;
    @Autowired private TransferService transferService;
    @Autowired private EntityManager entityManager;
    @Autowired private BudgetRepository budgetRepository;
    @Autowired private BudgetService budgetService;
    @Autowired private TransactionService transactionHistoryService;

    @MockitoSpyBean(reset = MockReset.AFTER)
    private LedgerEntryRepository ledgerEntryRepositorySpy;

    @Test
    void appliesAllMigrationsAndValidatesTheJpaSchema() {
        List<Map<String, Object>> migrations = jdbcTemplate.queryForList("""
                select version, description, checksum, success
                from flyway_schema_history
                where version is not null
                order by installed_rank
                """);

        assertThat(migrations)
                .hasSize(11)
                .allSatisfy(migration -> {
                    assertThat(migration.get("checksum")).isNotNull();
                    assertThat(migration.get("success")).isEqualTo(true);
                });
        assertThat(migrations)
                .extracting(migration -> migration.get("version"))
                .containsExactly("1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11");
        assertThat(migrations)
                .extracting(migration -> migration.get("description"))
                .containsExactly("legacy schema baseline", "reconcile jpa schema constraints and indexes",
                        "add saving goal optimistic lock", "create accounts",
                        "create financial transactions and ledger entries",
                        "add legacy operation metadata to financial transactions",
                        "enforce unique reversals and shared operation ids",
                        "add legacy migration tracking", "create budgets", "create refresh tokens",
                        "add category type and active");
    }

    @Test
    void categoryV11EnforcesTypedUniquenessAndDefaults() {
        Long userId = jdbcTemplate.queryForObject(
                "insert into users (name, email, password) values (?, ?, ?) returning id",
                Long.class, "Category V11", "category-v11-" + UUID.randomUUID() + "@test.local", "not-a-real-password");

        Long expenseId = jdbcTemplate.queryForObject(
                "insert into categories (name, user_id) values (?, ?) returning id", Long.class, "Other", userId);
        Long incomeId = jdbcTemplate.queryForObject(
                "insert into categories (name, user_id, type) values (?, ?, ?) returning id", Long.class, "Other", userId, "INCOME");

        assertThat(expenseId).isNotEqualTo(incomeId);
        assertThat(jdbcTemplate.queryForObject("select type = 'EXPENSE' and active and version = 0 from categories where id = ?",
                Boolean.class, expenseId)).isTrue();
        assertThatThrownBy(() -> jdbcTemplate.update(
                "insert into categories (name, user_id, type) values (?, ?, ?)", "Other", userId, "EXPENSE"))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbcTemplate.update(
                "insert into categories (name, user_id, type) values (?, ?, ?)", "Invalid", userId, "OTHER"))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
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
                "saving_movements", "credits", "credit_payments", "user_alerts_seen", "accounts",
                "financial_transactions", "ledger_entries", "budgets", "refresh_tokens");

        Integer tablesFound = jdbcTemplate.queryForObject("""
                select count(*) from information_schema.tables
                where table_schema = 'public' and table_name in
                ('users', 'roles', 'categories', 'incomes', 'expenses', 'saving_goals',
                 'saving_movements', 'credits', 'credit_payments', 'user_alerts_seen', 'accounts',
                 'financial_transactions', 'ledger_entries', 'budgets', 'refresh_tokens')
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
        assertNumericColumn("ledger_entries", "signed_amount", 19, 4);
        assertNumericColumn("budgets", "limit_amount", 19, 4);
        assertThat(jdbcTemplate.queryForObject("""
                select count(*)
                from information_schema.columns
                where table_schema = 'public' and table_name = 'accounts'
                  and column_name in ('user_id', 'name', 'type', 'currency', 'active', 'created_at', 'updated_at', 'version')
                """, Integer.class)).isEqualTo(8);

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
                "uk_user_alert_seen_without_related", "idx_financial_transactions_user_effective_date",
                "idx_financial_transactions_user_type_effective_date", "idx_ledger_entries_account_id",
                "idx_ledger_entries_financial_transaction_id", "uk_financial_transactions_reversal_of");
        assertIndexes("idx_budgets_user_period", "idx_refresh_tokens_user_id", "idx_refresh_tokens_family_id",
                "idx_refresh_tokens_expires_at");

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
    void enforcesAccountPostgreSqlConstraintsAndOptimisticLocking() throws Exception {
        User user = createUser();
        Account account = new Account();
        account.setUser(user);
        account.setName("PostgreSQL bank");
        account.setType(AccountType.BANK);
        account.setCurrency("COP");
        account.setActive(true);
        account = accountRepository.saveAndFlush(account);

        assertThat(account.getVersion()).isEqualTo(0L);
        assertThatThrownBy(() -> jdbcTemplate.update("""
                insert into accounts (user_id, name, type, currency, active, created_at, updated_at, version)
                values (?, ?, ?, ?, true, current_timestamp, current_timestamp, 0)
                """, user.getId(), "PostgreSQL bank", "BANK", "COP"))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbcTemplate.update("""
                insert into accounts (user_id, name, type, currency, active, created_at, updated_at, version)
                values (?, ?, ?, ?, true, current_timestamp, current_timestamp, 0)
                """, user.getId(), "Invalid account", "CREDIT_CARD", "COP"))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbcTemplate.update("""
                insert into accounts (user_id, name, type, currency, active, created_at, updated_at, version)
                values (?, ?, ?, ?, true, current_timestamp, current_timestamp, 0)
                """, user.getId(), "Bad currency", "BANK", "CO"))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);

        Account savedAccount = account;
        CyclicBarrier loaded = new CyclicBarrier(2);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<Boolean> first = executor.submit(() -> updateStaleAccount(savedAccount.getId(), loaded));
            Future<Boolean> second = executor.submit(() -> updateStaleAccount(savedAccount.getId(), loaded));
            assertThat(first.get()).isNotEqualTo(second.get());
        } finally {
            executor.shutdownNow();
        }

        assertThat(accountRepository.findById(savedAccount.getId()).orElseThrow().getVersion()).isEqualTo(1L);
    }

    @Test
    void ledgerRecordsIncomeExpenseAndOpeningBalanceFromPostgreSql() {
        User user = createUser();
        Account account = createAccount(user, "Ledger account", true);
        long transactionsBefore = financialTransactionRepository.count();
        long entriesBefore = ledgerEntryRepository.count();

        ledgerService.recordOpeningBalance(user.getId(), account.getId(), command("500000.0000", "COP"));
        ledgerService.recordIncome(user.getId(), account.getId(), command("100000.0000", "COP"));
        ledgerService.recordExpense(user.getId(), account.getId(), command("200000.0000", "COP"));

        assertThat(financialTransactionRepository.count()).isEqualTo(transactionsBefore + 3);
        assertThat(ledgerEntryRepository.count()).isEqualTo(entriesBefore + 3);
        assertThat(ledgerService.getAccountBalance(user.getId(), account.getId())).isEqualByComparingTo("400000.0000");
        Long transactionId = jdbcTemplate.queryForObject("select min(id) from financial_transactions", Long.class);
        assertThatThrownBy(() -> jdbcTemplate.update("""
                insert into ledger_entries (financial_transaction_id, account_id, signed_amount, created_at)
                values (?, ?, 0, current_timestamp)
                """, transactionId, account.getId()))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }

    @Test
    void ledgerRejectsForeignInactiveAndCurrencyMismatchedAccountsAndForeignCategories() {
        User owner = createUser();
        User other = createUser();
        Account active = createAccount(owner, "Active ledger account", true);
        Account inactive = createAccount(owner, "Inactive ledger account", false);
        Account foreign = createAccount(other, "Foreign ledger account", true);
        Category foreignCategory = new Category();
        foreignCategory.setName("Other category");
        foreignCategory.setUser(other);
        foreignCategory = categoryRepository.saveAndFlush(foreignCategory);

        assertThatThrownBy(() -> ledgerService.recordIncome(owner.getId(), foreign.getId(), command("1.0000", "COP")))
                .isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> ledgerService.getAccountBalance(owner.getId(), foreign.getId()))
                .isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> ledgerService.recordIncome(owner.getId(), inactive.getId(), command("1.0000", "COP")))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> ledgerService.recordExpense(owner.getId(), active.getId(), command("1.0000", "USD")))
                .isInstanceOf(BadRequestException.class);

        FinancialOperationCommand categoryCommand = new FinancialOperationCommand(
                new BigDecimal("1.0000"), LocalDate.now(), null, "COP", foreignCategory.getId());
        assertThatThrownBy(() -> ledgerService.recordExpense(owner.getId(), active.getId(), categoryCommand))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void ledgerCreationRollsBackWhenItsEntryCannotBePersisted() {
        User user = createUser();
        Account account = createAccount(user, "Atomic ledger account", true);
        long transactionsBefore = financialTransactionRepository.count();
        long entriesBefore = ledgerEntryRepository.count();

        assertThatThrownBy(() -> ledgerService.recordIncome(user.getId(), account.getId(),
                command("1000000000000000.0000", "COP")))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);

        assertThat(financialTransactionRepository.count()).isEqualTo(transactionsBefore);
        assertThat(ledgerEntryRepository.count()).isEqualTo(entriesBefore);
    }

    @Test
    void reversalIsAtomicUniqueAndKeepsBothSidesInTheBalance() throws Exception {
        User user = createUser();
        Account account = createAccount(user, "Reversal account", true);
        long entriesBefore = ledgerEntryRepository.count();
        ledgerService.recordOpeningBalance(user.getId(), account.getId(), command("500000.0000", "COP"));
        var expense = ledgerService.recordExpense(user.getId(), account.getId(), command("100000.0000", "COP"));
        assertThat(ledgerService.getAccountBalance(user.getId(), account.getId())).isEqualByComparingTo("400000.0000");

        CyclicBarrier launch = new CyclicBarrier(2);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<Boolean> first = executor.submit(() -> reverseConcurrently(expense.getId(), user.getId(), launch));
            Future<Boolean> second = executor.submit(() -> reverseConcurrently(expense.getId(), user.getId(), launch));
            assertThat(first.get()).isNotEqualTo(second.get());
        } finally {
            executor.shutdownNow();
        }

        assertThat(financialTransactionRepository.findById(expense.getId()).orElseThrow().getStatus().name())
                .isEqualTo("REVERSED");
        assertThat(jdbcTemplate.queryForObject("select count(*) from financial_transactions where reversal_of_id = ?",
                Integer.class, expense.getId())).isEqualTo(1);
        assertThat(ledgerEntryRepository.count()).isEqualTo(entriesBefore + 3);
        assertThat(ledgerService.getAccountBalance(user.getId(), account.getId())).isEqualByComparingTo("500000.0000");
    }

    @Test
    void legacyMigratorUsesNonBlockingPostgresAdvisoryLockAndReleasesIt() throws Exception {
        User user = createUser();
        Income income = new Income();
        income.setUser(user); income.setAmount(new BigDecimal("42.0000")); income.setIncomeDate(LocalDate.now());
        incomeRepository.saveAndFlush(income);
        long transactionsBefore = financialTransactionRepository.count();
        long entriesBefore = ledgerEntryRepository.count();

        try (var firstMigratorSession = dataSource.getConnection();
             var lock = firstMigratorSession.prepareStatement("select pg_try_advisory_lock(?)")) {
            lock.setLong(1, LegacyLedgerMigrationService.MIGRATION_ADVISORY_LOCK_KEY);
            var result = lock.executeQuery(); result.next();
            assertThat(result.getBoolean(1)).isTrue();

            assertThatThrownBy(() -> legacyMigrationService.migrate(100))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("migración legacy activa");
            assertThat(financialTransactionRepository.count()).isEqualTo(transactionsBefore);
            assertThat(ledgerEntryRepository.count()).isEqualTo(entriesBefore);

            try (var unlock = firstMigratorSession.prepareStatement("select pg_advisory_unlock(?)")) {
                unlock.setLong(1, LegacyLedgerMigrationService.MIGRATION_ADVISORY_LOCK_KEY);
                unlock.execute();
            }
        }

        legacyMigrationService.migrate(100);
        assertThat(financialTransactionRepository.count()).isEqualTo(transactionsBefore + 1);
        assertThat(ledgerEntryRepository.count()).isEqualTo(entriesBefore + 1);
        legacyMigrationService.migrate(100);
        assertThat(financialTransactionRepository.count()).isEqualTo(transactionsBefore + 1);
    }

    @Test
    void transferIsBalancedValidatesFundsAndCanBeReversed() {
        User owner = createUser();
        User other = createUser();
        Account source = createAccount(owner, "Transfer source", true);
        Account destination = createAccount(owner, "Transfer destination", true);
        Account foreign = createAccount(other, "Foreign transfer", true);
        ledgerService.recordOpeningBalance(owner.getId(), source.getId(), command("500000.0000", "COP"));
        ledgerService.recordOpeningBalance(owner.getId(), destination.getId(), command("100000.0000", "COP"));
        CreateTransferRequest request = transfer(source.getId(), destination.getId(), "200000.0000");
        var response = transferService.create(owner.getId(), request);
        assertThat(response.getSourceAccountId()).isEqualTo(source.getId());
        assertThat(response.getDestinationAccountId()).isEqualTo(destination.getId());
        assertThat(response.getAmount()).isEqualByComparingTo("200000.0000");
        assertThat(response.getCurrency()).isEqualTo("COP");
        assertThat(response.getStatus()).isEqualTo("POSTED");
        assertThat(ledgerService.getAccountBalance(owner.getId(), source.getId())).isEqualByComparingTo("300000.0000");
        assertThat(ledgerService.getAccountBalance(owner.getId(), destination.getId())).isEqualByComparingTo("300000.0000");
        assertThat(jdbcTemplate.queryForObject("select sum(signed_amount) from ledger_entries where financial_transaction_id=?", BigDecimal.class, response.getId())).isEqualByComparingTo("0");
        assertThatThrownBy(() -> transferService.create(owner.getId(), transfer(source.getId(), source.getId(), "1"))).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> transferService.create(owner.getId(), transfer(source.getId(), foreign.getId(), "1"))).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> transferService.create(owner.getId(), transfer(source.getId(), destination.getId(), "400000"))).isInstanceOf(BadRequestException.class);
        ledgerService.reverseTransaction(response.getId(), owner.getId());
        assertThat(ledgerService.getAccountBalance(owner.getId(), source.getId())).isEqualByComparingTo("500000.0000");
        assertThat(ledgerService.getAccountBalance(owner.getId(), destination.getId())).isEqualByComparingTo("100000.0000");
        assertThatThrownBy(() -> ledgerService.reverseTransaction(response.getId(), owner.getId())).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> ledgerService.reverseTransaction(response.getId(), other.getId())).isInstanceOf(NotFoundException.class);
    }

    @Test
    void concurrentTransfersCannotOverdrawTheSamePostgresAccount() throws Exception {
        User owner = createUser(); Account source = createAccount(owner, "Concurrent source", true);
        Account firstDestination = createAccount(owner, "Concurrent first", true);
        Account secondDestination = createAccount(owner, "Concurrent second", true);
        ledgerService.recordOpeningBalance(owner.getId(), source.getId(), command("100000", "COP"));
        CyclicBarrier barrier = new CyclicBarrier(2); ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<Boolean> first = pool.submit(() -> attemptTransfer(owner.getId(), transfer(source.getId(), firstDestination.getId(), "80000"), barrier));
            Future<Boolean> second = pool.submit(() -> attemptTransfer(owner.getId(), transfer(source.getId(), secondDestination.getId(), "80000"), barrier));
            assertThat(first.get()).isNotEqualTo(second.get());
        } finally { pool.shutdownNow(); }
        assertThat(ledgerService.getAccountBalance(owner.getId(), source.getId())).isEqualByComparingTo("20000");
        assertThat(jdbcTemplate.queryForObject("select count(*) from financial_transactions where type='TRANSFER'", Integer.class)).isGreaterThanOrEqualTo(1);
    }

    @Test
    void transferRejectsInactiveAccountsAndCurrencyMismatchWithoutPersistence() {
        User owner = createUser();
        Account active = createAccount(owner, "Active transfer", true);
        Account inactive = createAccount(owner, "Inactive transfer", false);
        Account destination = createAccount(owner, "Destination transfer", true);
        Account usd = createAccount(owner, "USD transfer", true, "USD");
        ledgerService.recordOpeningBalance(owner.getId(), active.getId(), command("100000", "COP"));
        long transactionsBefore = financialTransactionRepository.count();
        long entriesBefore = ledgerEntryRepository.count();
        BigDecimal activeBalance = ledgerService.getAccountBalance(owner.getId(), active.getId());
        BigDecimal destinationBalance = ledgerService.getAccountBalance(owner.getId(), destination.getId());

        assertThatThrownBy(() -> transferService.create(owner.getId(), transfer(inactive.getId(), destination.getId(), "1")))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> transferService.create(owner.getId(), transfer(active.getId(), inactive.getId(), "1")))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> transferService.create(owner.getId(), transfer(active.getId(), usd.getId(), "1")))
                .isInstanceOf(BadRequestException.class);

        assertThat(financialTransactionRepository.count()).isEqualTo(transactionsBefore);
        assertThat(ledgerEntryRepository.count()).isEqualTo(entriesBefore);
        assertThat(ledgerService.getAccountBalance(owner.getId(), active.getId())).isEqualByComparingTo(activeBalance);
        assertThat(ledgerService.getAccountBalance(owner.getId(), destination.getId())).isEqualByComparingTo(destinationBalance);
    }

    @Test
    void transferReversalWorksAfterBothOriginalAccountsBecomeInactive() {
        User owner = createUser();
        Account source = createAccount(owner, "Inactive reversal source", true);
        Account destination = createAccount(owner, "Inactive reversal destination", true);
        ledgerService.recordOpeningBalance(owner.getId(), source.getId(), command("500000", "COP"));
        ledgerService.recordOpeningBalance(owner.getId(), destination.getId(), command("100000", "COP"));
        var transfer = transferService.create(owner.getId(), transfer(source.getId(), destination.getId(), "200000"));
        source.setActive(false);
        destination.setActive(false);
        accountRepository.saveAndFlush(source);
        accountRepository.saveAndFlush(destination);

        ledgerService.reverseTransaction(transfer.getId(), owner.getId());

        assertThat(ledgerService.getAccountBalance(owner.getId(), source.getId())).isEqualByComparingTo("500000");
        assertThat(ledgerService.getAccountBalance(owner.getId(), destination.getId())).isEqualByComparingTo("100000");
        assertThat(financialTransactionRepository.findById(transfer.getId()).orElseThrow().getStatus().name()).isEqualTo("REVERSED");
    }

    @Test
    void transferRollsBackTransactionAndFirstEntryWhenSecondEntryPersistenceFails() {
        User owner = createUser();
        Account source = createAccount(owner, "Atomic transfer source", true);
        Account destination = createAccount(owner, "Atomic transfer destination", true);
        ledgerService.recordOpeningBalance(owner.getId(), source.getId(), command("100000", "COP"));
        long transactionsBefore = financialTransactionRepository.count();
        long entriesBefore = ledgerEntryRepository.count();
        BigDecimal sourceBefore = ledgerService.getAccountBalance(owner.getId(), source.getId());
        BigDecimal destinationBefore = ledgerService.getAccountBalance(owner.getId(), destination.getId());
        java.util.concurrent.atomic.AtomicInteger saves = new java.util.concurrent.atomic.AtomicInteger();
        doAnswer(invocation -> {
            if (saves.incrementAndGet() == 2) {
                throw new org.springframework.dao.DataIntegrityViolationException("forced second ledger entry failure");
            }
            com.jr.finance.api.ledger.LedgerEntry entry = invocation.getArgument(0);
            entityManager.persist(entry);
            return entry;
        }).when(ledgerEntryRepositorySpy).save(any(com.jr.finance.api.ledger.LedgerEntry.class));

        assertThatThrownBy(() -> transferService.create(owner.getId(), transfer(source.getId(), destination.getId(), "20000")))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);

        assertThat(saves.get()).isEqualTo(2);
        assertThat(financialTransactionRepository.count()).isEqualTo(transactionsBefore);
        assertThat(ledgerEntryRepository.count()).isEqualTo(entriesBefore);
        assertThat(ledgerService.getAccountBalance(owner.getId(), source.getId())).isEqualByComparingTo(sourceBefore);
        assertThat(ledgerService.getAccountBalance(owner.getId(), destination.getId())).isEqualByComparingTo(destinationBefore);
    }

    @Test
    void concurrentPostgresBudgetCreationLeavesOneRowAndOneConflict() throws Exception {
        User owner = createUser();
        Category category = new Category();
        category.setUser(owner);
        category.setName("Concurrent budget");
        category = categoryRepository.saveAndFlush(category);
        Long categoryId = category.getId();
        CyclicBarrier barrier = new CyclicBarrier(2);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<Boolean> first = pool.submit(() -> attemptBudgetCreate(owner.getId(), categoryId, barrier));
            Future<Boolean> second = pool.submit(() -> attemptBudgetCreate(owner.getId(), categoryId, barrier));
            assertThat(first.get()).isNotEqualTo(second.get());
        } finally {
            pool.shutdownNow();
        }
        assertThat(budgetRepository.countByUserIdAndCategoryIdAndYearAndMonth(owner.getId(), categoryId, 2026, 8))
                .isEqualTo(1);
    }

    @Test
    void postgresBudgetVersionRejectsAStaleUpdate() {
        User owner = createUser();
        Category category = new Category();
        category.setUser(owner);
        category.setName("Versioned budget");
        category = categoryRepository.saveAndFlush(category);
        CreateBudgetRequest request = new CreateBudgetRequest();
        request.setCategoryId(category.getId());
        request.setYear(2026);
        request.setMonth(8);
        request.setLimitAmount(new BigDecimal("100"));
        Long budgetId = budgetService.create(owner.getId(), request).getId();

        Budget first = new TransactionTemplate(transactionManager)
                .execute(status -> budgetRepository.findById(budgetId).orElseThrow());
        Budget stale = new TransactionTemplate(transactionManager)
                .execute(status -> budgetRepository.findById(budgetId).orElseThrow());
        first.setLimitAmount(new BigDecimal("200"));
        stale.setLimitAmount(new BigDecimal("300"));
        new TransactionTemplate(transactionManager)
                .executeWithoutResult(status -> budgetRepository.saveAndFlush(first));

        assertThatThrownBy(() -> new TransactionTemplate(transactionManager)
                .executeWithoutResult(status -> budgetRepository.saveAndFlush(stale)))
                .isInstanceOf(ObjectOptimisticLockingFailureException.class);
    }

    @Test
    void transactionHistoryUsesPostgresPaginationAndAccountFilter() {
        User owner = createUser();
        Account source = createAccount(owner, "History source", true);
        Account destination = createAccount(owner, "History destination", true);
        ledgerService.recordIncome(owner.getId(), source.getId(), command("100", "COP"));
        ledgerService.recordOpeningBalance(owner.getId(), destination.getId(), command("10", "COP"));

        var page = transactionHistoryService.find(owner.getId(), new TransactionQuery(null, null, null, null,
                source.getId(), null, null, null, 0, 1));

        assertThat(page.totalElements()).isEqualTo(1);
        assertThat(page.content()).hasSize(1);
        assertThat(page.content().getFirst().accountId()).isEqualTo(source.getId());
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

    private boolean reverseConcurrently(Long transactionId, Long userId, CyclicBarrier launch) {
        try {
            await(launch);
            ledgerService.reverseTransaction(transactionId, userId);
            return true;
        } catch (ConflictException ex) {
            return false;
        }
    }

    private boolean updateStaleAccount(Long accountId, CyclicBarrier loaded) {
        try {
            new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                Account account = accountRepository.findById(accountId).orElseThrow();
                await(loaded);
                account.setActive(!account.isActive());
                accountRepository.saveAndFlush(account);
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

    private Account createAccount(User user, String name, boolean active) {
        return createAccount(user, name, active, "COP");
    }

    private Account createAccount(User user, String name, boolean active, String currency) {
        Account account = new Account();
        account.setUser(user);
        account.setName(name);
        account.setType(AccountType.BANK);
        account.setCurrency(currency);
        account.setActive(active);
        return accountRepository.saveAndFlush(account);
    }

    private FinancialOperationCommand command(String amount, String currency) {
        return new FinancialOperationCommand(new BigDecimal(amount), LocalDate.now(), "  Ledger test  ", currency, null);
    }

    private CreateTransferRequest transfer(Long source, Long destination, String amount) {
        CreateTransferRequest request = new CreateTransferRequest(); request.setSourceAccountId(source); request.setDestinationAccountId(destination);
        request.setAmount(new BigDecimal(amount)); request.setEffectiveDate(LocalDate.now()); request.setDescription("Transfer test"); return request;
    }

    private boolean attemptTransfer(Long userId, CreateTransferRequest request, CyclicBarrier barrier) {
        try { await(barrier); transferService.create(userId, request); return true; }
        catch (BadRequestException ex) { return false; }
    }

    private boolean attemptBudgetCreate(Long userId, Long categoryId, CyclicBarrier barrier) {
        try {
            await(barrier);
            CreateBudgetRequest request = new CreateBudgetRequest();
            request.setCategoryId(categoryId);
            request.setYear(2026);
            request.setMonth(8);
            request.setLimitAmount(BigDecimal.TEN);
            budgetService.create(userId, request);
            return true;
        } catch (ConflictException ex) {
            return false;
        }
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
