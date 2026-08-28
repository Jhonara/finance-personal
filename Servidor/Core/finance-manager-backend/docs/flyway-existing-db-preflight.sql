-- Solo diagnóstico: no modifica datos ni esquema.
-- Ejecutar antes de habilitar FLYWAY_BASELINE_ON_MIGRATE=true en una base previa.

SELECT 'categories without owner' AS check_name, count(*) AS rows_found
FROM categories WHERE user_id IS NULL
UNION ALL
SELECT 'duplicate category names per user', count(*)
FROM (SELECT user_id, name FROM categories GROUP BY user_id, name HAVING count(*) > 1) duplicates
UNION ALL
SELECT 'incomes without owner or nonpositive amount', count(*)
FROM incomes WHERE user_id IS NULL OR amount <= 0
UNION ALL
SELECT 'expenses without owner or nonpositive amount', count(*)
FROM expenses WHERE user_id IS NULL OR amount <= 0
UNION ALL
SELECT 'saving goals incompatible with required fields', count(*)
FROM saving_goals WHERE user_id IS NULL OR name IS NULL OR target_amount IS NULL
    OR current_amount IS NULL OR target_amount <= 0 OR current_amount < 0
UNION ALL
SELECT 'saving movements incompatible with required fields', count(*)
FROM saving_movements WHERE saving_goal_id IS NULL OR amount IS NULL
    OR movement_date IS NULL OR amount <= 0
UNION ALL
SELECT 'credits incompatible with required fields', count(*)
FROM credits WHERE user_id IS NULL OR name IS NULL OR created_at IS NULL
    OR amount <= 0 OR interest_rate < 0 OR installments <= 0
    OR (payment_day IS NOT NULL AND payment_day NOT BETWEEN 1 AND 31)
UNION ALL
SELECT 'credit payments with invalid amounts', count(*)
FROM credit_payments WHERE amount <= 0 OR (extra_payment IS NOT NULL AND extra_payment < 0);

SELECT tc.table_name, kcu.column_name, ccu.table_name AS referenced_table,
       ccu.column_name AS referenced_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

SELECT table_name, column_name, data_type, is_nullable,
       numeric_precision, numeric_scale, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
