package com.jr.finance.api.ledger;

public record LegacyMigrationReport(
        int incomesFound, int incomesMigrated, int incomesAlreadyMigrated, int incomesInvalid,
        int expensesFound, int expensesMigrated, int expensesAlreadyMigrated, int expensesInvalid,
        int historicalAccountsCreated, int errors) {
}
