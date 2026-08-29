CREATE TABLE budgets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    category_id BIGINT NOT NULL REFERENCES categories(id),
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL,
    limit_amount NUMERIC(19,4) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_budgets_year CHECK (period_year BETWEEN 2000 AND 2100),
    CONSTRAINT ck_budgets_month CHECK (period_month BETWEEN 1 AND 12),
    CONSTRAINT ck_budgets_limit_amount_positive CHECK (limit_amount > 0),
    CONSTRAINT uk_budgets_user_category_period UNIQUE (user_id, category_id, period_year, period_month)
);

CREATE INDEX idx_budgets_user_period ON budgets (user_id, period_year, period_month);
