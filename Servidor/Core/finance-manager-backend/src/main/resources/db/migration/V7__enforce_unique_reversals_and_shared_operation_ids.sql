-- A ledger reversal can point to an original transaction only once.
CREATE UNIQUE INDEX uk_financial_transactions_reversal_of
    ON financial_transactions (reversal_of_id)
    WHERE reversal_of_id IS NOT NULL;

-- During the legacy/ledger transition, API responses expose ids from both sources.
-- A shared sequence prevents future inserts in the three tables from reusing one another's ids.
CREATE SEQUENCE operation_ids_seq AS BIGINT;

SELECT setval(
    'operation_ids_seq',
    GREATEST(
        1,
        COALESCE((SELECT MAX(id) FROM incomes), 0),
        COALESCE((SELECT MAX(id) FROM expenses), 0),
        COALESCE((SELECT MAX(id) FROM financial_transactions), 0)
    ),
    true
);

ALTER TABLE incomes ALTER COLUMN id SET DEFAULT nextval('operation_ids_seq');
ALTER TABLE expenses ALTER COLUMN id SET DEFAULT nextval('operation_ids_seq');
ALTER TABLE financial_transactions ALTER COLUMN id SET DEFAULT nextval('operation_ids_seq');
