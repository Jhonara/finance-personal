ALTER TABLE purchase_drafts ADD COLUMN source VARCHAR(16) NOT NULL DEFAULT 'PASTED_TEXT';
ALTER TABLE purchase_drafts ADD CONSTRAINT ck_purchase_draft_source CHECK (source IN ('PASTED_TEXT', 'SHORTCUT'));
