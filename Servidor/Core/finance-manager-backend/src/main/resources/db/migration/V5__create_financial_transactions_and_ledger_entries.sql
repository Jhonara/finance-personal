CREATE TABLE financial_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    type VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL,
    effective_date DATE NOT NULL,
    description VARCHAR(255),
    category_id BIGINT REFERENCES categories(id),
    currency VARCHAR(3) NOT NULL,
    reversal_of_id BIGINT REFERENCES financial_transactions(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_financial_transactions_type CHECK (type IN ('INCOME', 'EXPENSE', 'OPENING_BALANCE', 'REVERSAL', 'TRANSFER')),
    CONSTRAINT ck_financial_transactions_status CHECK (status IN ('POSTED', 'VOIDED', 'REVERSED')),
    CONSTRAINT ck_financial_transactions_currency_iso CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT ck_financial_transactions_description_not_blank CHECK (description IS NULL OR length(trim(description)) > 0),
    CONSTRAINT ck_financial_transactions_reversal_not_self CHECK (reversal_of_id IS NULL OR reversal_of_id <> id)
);

CREATE TABLE ledger_entries (
    id BIGSERIAL PRIMARY KEY,
    financial_transaction_id BIGINT NOT NULL REFERENCES financial_transactions(id),
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    signed_amount NUMERIC(19,4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_ledger_entries_signed_amount_not_zero CHECK (signed_amount <> 0)
);

CREATE INDEX idx_financial_transactions_user_effective_date
    ON financial_transactions (user_id, effective_date);
CREATE INDEX idx_financial_transactions_user_type_effective_date
    ON financial_transactions (user_id, type, effective_date);
CREATE INDEX idx_ledger_entries_account_id ON ledger_entries (account_id);
CREATE INDEX idx_ledger_entries_financial_transaction_id ON ledger_entries (financial_transaction_id);
