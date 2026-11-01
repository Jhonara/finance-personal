-- Preserve every existing budget and its unique category/period identity.
ALTER TABLE budgets ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
