-- Read-only preflight. Run against PostgreSQL before enabling the Java migrator.
SELECT 'incomes_total' AS metric, count(*)::text AS value FROM incomes
UNION ALL SELECT 'expenses_total', count(*)::text FROM expenses
UNION ALL SELECT 'incomes_already_migrated', count(*)::text FROM financial_transactions WHERE legacy_source = 'INCOME'
UNION ALL SELECT 'expenses_already_migrated', count(*)::text FROM financial_transactions WHERE legacy_source = 'EXPENSE'
UNION ALL SELECT 'invalid_income_amount_or_date', count(*)::text FROM incomes WHERE amount IS NULL OR amount <= 0 OR income_date IS NULL
UNION ALL SELECT 'invalid_expense_amount_or_date', count(*)::text FROM expenses WHERE amount IS NULL OR amount <= 0 OR expense_date IS NULL
UNION ALL SELECT 'expense_category_owner_mismatch', count(*)::text
FROM expenses e JOIN categories c ON c.id = e.category_id WHERE c.user_id <> e.user_id;

-- Per-user/month reconciliation baseline for later comparison with tracked ledger entries.
SELECT user_id, date_trunc('month', income_date)::date AS period, sum(amount) AS income_total
FROM incomes GROUP BY user_id, date_trunc('month', income_date)
ORDER BY user_id, period;

SELECT user_id, date_trunc('month', expense_date)::date AS period, sum(amount) AS expense_total
FROM expenses GROUP BY user_id, date_trunc('month', expense_date)
ORDER BY user_id, period;
