CREATE TABLE purchase_drafts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_key VARCHAR(80) NOT NULL,
    initial_fingerprint VARCHAR(64) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    kind VARCHAR(16) NOT NULL CHECK (kind IN ('EXPENSE', 'OTHER')),
    status VARCHAR(16) NOT NULL CHECK (status IN ('PENDING', 'POSTED', 'LINKED')),
    description VARCHAR(120) NOT NULL,
    amount NUMERIC(19,4) CHECK (amount > 0),
    currency VARCHAR(3),
    effective_date DATE,
    account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
    category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    transaction_id BIGINT REFERENCES financial_transactions(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_purchase_draft_request UNIQUE (user_id, request_key)
);
CREATE INDEX idx_purchase_draft_pending ON purchase_drafts(user_id, status, id);
