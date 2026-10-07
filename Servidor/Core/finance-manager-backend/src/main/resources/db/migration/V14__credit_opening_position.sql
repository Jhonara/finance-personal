ALTER TABLE credits ADD COLUMN opening_balance NUMERIC(19,2);
ALTER TABLE credits ADD COLUMN opening_date DATE;
ALTER TABLE credits ADD COLUMN opening_remaining_months INTEGER;
ALTER TABLE credits ADD COLUMN opening_next_payment_date DATE;
ALTER TABLE credits ADD CONSTRAINT ck_credit_opening_position CHECK (
    (opening_balance IS NULL AND opening_date IS NULL AND opening_remaining_months IS NULL AND opening_next_payment_date IS NULL)
    OR (opening_balance IS NOT NULL AND opening_balance > 0 AND opening_balance <= amount
        AND opening_date IS NOT NULL AND opening_date >= start_date
        AND opening_remaining_months IS NOT NULL AND opening_remaining_months BETWEEN 1 AND installments
        AND opening_next_payment_date IS NOT NULL AND opening_next_payment_date > opening_date)
);
