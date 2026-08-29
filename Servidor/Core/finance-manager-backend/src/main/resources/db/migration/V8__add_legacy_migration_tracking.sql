ALTER TABLE financial_transactions
    ADD COLUMN legacy_source VARCHAR(20),
    ADD COLUMN legacy_id BIGINT;

ALTER TABLE financial_transactions
    ADD CONSTRAINT ck_financial_transactions_legacy_tracking
    CHECK ((legacy_source IS NULL AND legacy_id IS NULL)
        OR (legacy_source IN ('INCOME', 'EXPENSE') AND legacy_id IS NOT NULL));

CREATE UNIQUE INDEX uk_financial_transactions_legacy_source_id
    ON financial_transactions (legacy_source, legacy_id)
    WHERE legacy_source IS NOT NULL;

CREATE TABLE legacy_account_mappings (
    user_id BIGINT PRIMARY KEY REFERENCES users(id),
    account_id BIGINT NOT NULL UNIQUE REFERENCES accounts(id)
);
