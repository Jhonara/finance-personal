ALTER TABLE saving_goals ADD COLUMN currency VARCHAR(3);
ALTER TABLE saving_goals ADD CONSTRAINT ck_saving_goals_currency_iso
    CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$');
