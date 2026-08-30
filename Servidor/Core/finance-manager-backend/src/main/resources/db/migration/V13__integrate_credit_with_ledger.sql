ALTER TABLE financial_transactions DROP CONSTRAINT ck_financial_transactions_type;
ALTER TABLE financial_transactions ADD CONSTRAINT ck_financial_transactions_type
    CHECK (type IN ('INCOME', 'EXPENSE', 'OPENING_BALANCE', 'REVERSAL', 'TRANSFER', 'CREDIT_DISBURSEMENT', 'CREDIT_PAYMENT'));

ALTER TABLE credits ADD COLUMN IF NOT EXISTS disbursement_transaction_id BIGINT
    REFERENCES financial_transactions(id);
ALTER TABLE credit_payments
    ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES accounts(id),
    ADD COLUMN IF NOT EXISTS financial_transaction_id BIGINT REFERENCES financial_transactions(id),
    ADD COLUMN IF NOT EXISTS status VARCHAR(20);
UPDATE credit_payments SET status = 'POSTED' WHERE status IS NULL;
ALTER TABLE credit_payments ALTER COLUMN status SET NOT NULL;
ALTER TABLE credit_payments ALTER COLUMN status SET DEFAULT 'POSTED';
ALTER TABLE credit_payments ADD CONSTRAINT ck_credit_payments_status CHECK (status IN ('POSTED', 'REVERSED')) NOT VALID;
CREATE INDEX IF NOT EXISTS idx_credit_payments_financial_transaction_id ON credit_payments(financial_transaction_id);
CREATE INDEX IF NOT EXISTS idx_credits_disbursement_transaction_id ON credits(disbursement_transaction_id);
