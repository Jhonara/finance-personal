ALTER TABLE financial_transactions
    ADD COLUMN income_type VARCHAR(50),
    ADD COLUMN payment_type VARCHAR(50),
    ADD COLUMN expense_type VARCHAR(20);

-- New ledger-backed income and expense responses reuse the numeric id field.
-- Advance this sequence once so their ids cannot collide with existing legacy rows.
SELECT setval(
    pg_get_serial_sequence('financial_transactions', 'id'),
    GREATEST(
        COALESCE((SELECT MAX(id) FROM financial_transactions), 0),
        COALESCE((SELECT MAX(id) FROM incomes), 0),
        COALESCE((SELECT MAX(id) FROM expenses), 0),
        1
    )
);
