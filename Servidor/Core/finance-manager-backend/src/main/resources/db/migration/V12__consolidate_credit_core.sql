-- Credit Core: EA/fixed-payment semantics are implemented by the application.
-- Legacy payment columns remain for audit compatibility; new allocation columns are canonical.
ALTER TABLE credits
    ADD COLUMN IF NOT EXISTS currency VARCHAR(3),
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

UPDATE credits SET currency = 'COP' WHERE currency IS NULL;
ALTER TABLE credits ALTER COLUMN currency SET NOT NULL;
ALTER TABLE credits ALTER COLUMN currency SET DEFAULT 'COP';
ALTER TABLE credits ADD CONSTRAINT ck_credits_currency_iso CHECK (currency ~ '^[A-Z]{3}$') NOT VALID;

ALTER TABLE credit_payments
    ADD COLUMN IF NOT EXISTS total_amount NUMERIC(19,4),
    ADD COLUMN IF NOT EXISTS principal_amount NUMERIC(19,4),
    ADD COLUMN IF NOT EXISTS interest_amount NUMERIC(19,4),
    ADD COLUMN IF NOT EXISTS extra_principal_amount NUMERIC(19,4);

-- Historical records used amount plus optional extra_payment. Preserve their value without reinterpreting it.
UPDATE credit_payments
SET total_amount = amount + COALESCE(extra_payment, 0),
    principal_amount = amount,
    interest_amount = 0,
    extra_principal_amount = COALESCE(extra_payment, 0)
WHERE total_amount IS NULL;

ALTER TABLE credit_payments
    ALTER COLUMN total_amount SET NOT NULL,
    ALTER COLUMN principal_amount SET NOT NULL,
    ALTER COLUMN interest_amount SET NOT NULL,
    ALTER COLUMN extra_principal_amount SET NOT NULL;

ALTER TABLE credit_payments
    ADD CONSTRAINT ck_credit_payments_allocation_nonnegative
        CHECK (principal_amount >= 0 AND interest_amount >= 0 AND extra_principal_amount >= 0) NOT VALID,
    ADD CONSTRAINT ck_credit_payments_allocation_total
        CHECK (total_amount = principal_amount + interest_amount + extra_principal_amount) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_credit_payments_credit_payment_date_id
    ON credit_payments (credit_id, payment_date, id);
