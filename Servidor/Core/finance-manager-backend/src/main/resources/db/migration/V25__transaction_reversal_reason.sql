-- Additive metadata: original ledger entries and identifiers stay unchanged.
ALTER TABLE financial_transactions ADD COLUMN reversal_reason VARCHAR(255);
