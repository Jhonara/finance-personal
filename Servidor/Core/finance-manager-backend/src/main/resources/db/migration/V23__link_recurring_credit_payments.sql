ALTER TABLE recurring_rules ADD COLUMN credit_id BIGINT;
ALTER TABLE recurring_rules ADD CONSTRAINT fk_recurring_rules_credit
    FOREIGN KEY (credit_id) REFERENCES credits(id);

ALTER TABLE recurring_occurrences ADD COLUMN credit_id BIGINT;
ALTER TABLE recurring_occurrences ADD COLUMN credit_payment_id BIGINT;
ALTER TABLE recurring_occurrences ADD CONSTRAINT fk_recurring_occurrences_credit
    FOREIGN KEY (credit_id) REFERENCES credits(id);
ALTER TABLE recurring_occurrences ADD CONSTRAINT fk_recurring_occurrences_credit_payment
    FOREIGN KEY (credit_payment_id) REFERENCES credit_payments(id);
ALTER TABLE recurring_occurrences ADD CONSTRAINT uk_recurring_occurrence_credit_payment
    UNIQUE (credit_payment_id);
