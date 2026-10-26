ALTER TABLE purchase_drafts DROP CONSTRAINT ck_purchase_draft_source;
ALTER TABLE purchase_drafts ADD CONSTRAINT ck_purchase_draft_source CHECK (source IN ('PASTED_TEXT', 'SHORTCUT', 'APP_INTENT', 'WALLET'));
ALTER TABLE purchase_drafts ADD COLUMN native_fingerprint VARCHAR(64);
ALTER TABLE purchase_drafts ADD COLUMN card_reference VARCHAR(80);
ALTER TABLE purchase_drafts ADD COLUMN card_kind VARCHAR(16);
ALTER TABLE purchase_drafts ADD COLUMN occurred_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE purchase_drafts DROP CONSTRAINT purchase_drafts_status_check;
ALTER TABLE purchase_drafts ADD CONSTRAINT purchase_drafts_status_check CHECK (status IN ('PENDING', 'POSTED', 'LINKED', 'DISCARDED'));
CREATE TABLE wallet_card_links (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    reference VARCHAR(80) NOT NULL,
    name VARCHAR(80) NOT NULL,
    kind VARCHAR(16) NOT NULL CHECK (kind IN ('DEBIT', 'CREDIT')),
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    UNIQUE (user_id, reference)
);
