CREATE TABLE recurring_rules (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    request_key VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    kind VARCHAR(16) NOT NULL CHECK (kind IN ('INCOME', 'EXPENSE')),
    frequency VARCHAR(16) NOT NULL CHECK (frequency IN ('WEEKLY', 'BIWEEKLY', 'SEMIMONTHLY', 'MONTHLY')),
    mode VARCHAR(16) NOT NULL CHECK (mode IN ('AUTOMATIC', 'CONFIRM')),
    amount NUMERIC(19,4) NOT NULL CHECK (amount > 0),
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    category_id BIGINT REFERENCES categories(id),
    currency VARCHAR(3) NOT NULL,
    time_zone VARCHAR(64) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    first_day INTEGER NOT NULL CHECK (first_day BETWEEN 1 AND 31),
    second_day INTEGER CHECK (second_day BETWEEN 1 AND 31),
    next_date DATE NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_recurring_request UNIQUE (user_id, request_key),
    CONSTRAINT ck_recurring_end CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT ck_recurring_twice CHECK (frequency <> 'SEMIMONTHLY' OR
        (first_day <= 27 AND second_day IS NOT NULL AND second_day > first_day))
);
CREATE INDEX idx_recurring_due ON recurring_rules(active, next_date);
CREATE INDEX idx_recurring_user ON recurring_rules(user_id);

CREATE TABLE recurring_occurrences (
    id BIGSERIAL PRIMARY KEY,
    rule_id BIGINT NOT NULL REFERENCES recurring_rules(id),
    due_date DATE NOT NULL,
    name VARCHAR(100) NOT NULL,
    kind VARCHAR(16) NOT NULL,
    amount NUMERIC(19,4) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL,
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    category_id BIGINT REFERENCES categories(id),
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'POSTED', 'SKIPPED')),
    transaction_id BIGINT UNIQUE REFERENCES financial_transactions(id),
    issue VARCHAR(180),
    CONSTRAINT uk_recurring_due UNIQUE (rule_id, due_date)
);
CREATE INDEX idx_recurring_occurrence_date ON recurring_occurrences(rule_id, due_date);
