CREATE TABLE accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_accounts_user_name UNIQUE (user_id, name),
    CONSTRAINT ck_accounts_name_not_blank CHECK (length(trim(name)) > 0),
    CONSTRAINT ck_accounts_currency_iso CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT ck_accounts_type CHECK (type IN ('CASH', 'BANK', 'DIGITAL_WALLET', 'SAVINGS', 'INVESTMENT', 'OTHER'))
);
