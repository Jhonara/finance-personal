-- Reconciliation with the current JPA model. All foreign keys retain PostgreSQL's
-- default NO ACTION / RESTRICT semantics to preserve financial history.

ALTER TABLE categories
    ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE categories
    ADD CONSTRAINT uk_category_user_name UNIQUE (user_id, name);

ALTER TABLE incomes
    ALTER COLUMN user_id SET NOT NULL,
    ALTER COLUMN amount TYPE NUMERIC(19,4);

ALTER TABLE expenses
    ALTER COLUMN user_id SET NOT NULL,
    ALTER COLUMN amount TYPE NUMERIC(19,4);

ALTER TABLE saving_goals
    ALTER COLUMN user_id SET NOT NULL,
    ALTER COLUMN name SET NOT NULL,
    ALTER COLUMN target_amount SET NOT NULL,
    ALTER COLUMN target_amount TYPE NUMERIC(19,4),
    ALTER COLUMN current_amount SET NOT NULL,
    ALTER COLUMN current_amount TYPE NUMERIC(19,4),
    ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE saving_movements
    ALTER COLUMN saving_goal_id SET NOT NULL,
    ALTER COLUMN amount SET NOT NULL,
    ALTER COLUMN amount TYPE NUMERIC(19,4),
    ALTER COLUMN movement_date SET NOT NULL;

ALTER TABLE credits
    ALTER COLUMN user_id SET NOT NULL,
    ALTER COLUMN name SET NOT NULL,
    ALTER COLUMN amount TYPE NUMERIC(19,4),
    ALTER COLUMN interest_rate TYPE NUMERIC(9,6),
    ALTER COLUMN created_at SET NOT NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE credit_payments
    ALTER COLUMN amount TYPE NUMERIC(19,4),
    ALTER COLUMN extra_payment TYPE NUMERIC(19,4);

ALTER TABLE user_alerts_seen
    ALTER COLUMN seen_at SET NOT NULL;

ALTER TABLE incomes
    ADD CONSTRAINT ck_incomes_amount_positive CHECK (amount > 0) NOT VALID;
ALTER TABLE expenses
    ADD CONSTRAINT ck_expenses_amount_positive CHECK (amount > 0) NOT VALID;
ALTER TABLE saving_goals
    ADD CONSTRAINT ck_saving_goals_target_amount_positive CHECK (target_amount > 0) NOT VALID,
    ADD CONSTRAINT ck_saving_goals_current_amount_nonnegative CHECK (current_amount >= 0) NOT VALID;
ALTER TABLE saving_movements
    ADD CONSTRAINT ck_saving_movements_amount_positive CHECK (amount > 0) NOT VALID;
ALTER TABLE credits
    ADD CONSTRAINT ck_credits_amount_positive CHECK (amount > 0) NOT VALID,
    ADD CONSTRAINT ck_credits_interest_rate_nonnegative CHECK (interest_rate >= 0) NOT VALID,
    ADD CONSTRAINT ck_credits_installments_positive CHECK (installments > 0) NOT VALID,
    ADD CONSTRAINT ck_credits_payment_day_valid CHECK (payment_day IS NULL OR payment_day BETWEEN 1 AND 31) NOT VALID;
ALTER TABLE credit_payments
    ADD CONSTRAINT ck_credit_payments_amount_positive CHECK (amount > 0) NOT VALID,
    ADD CONSTRAINT ck_credit_payments_extra_payment_nonnegative CHECK (extra_payment IS NULL OR extra_payment >= 0) NOT VALID;

CREATE INDEX idx_expenses_user_expense_date ON expenses (user_id, expense_date);
CREATE INDEX idx_incomes_user_income_date ON incomes (user_id, income_date);
CREATE INDEX idx_credits_user_id ON credits (user_id);
CREATE INDEX idx_credit_payments_credit_payment_date ON credit_payments (credit_id, payment_date);
CREATE INDEX idx_saving_goals_user_id ON saving_goals (user_id);
CREATE INDEX idx_saving_movements_goal_movement_date ON saving_movements (saving_goal_id, movement_date);

-- The table-level unique constraint permits multiple NULL related_id values.
-- This partial index enforces the intended one-alert rule for global alerts.
CREATE UNIQUE INDEX uk_user_alert_seen_without_related
    ON user_alerts_seen (user_id, alert_code)
    WHERE related_id IS NULL;
