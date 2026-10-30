ALTER TABLE purchase_drafts DROP CONSTRAINT ck_purchase_draft_source;
ALTER TABLE purchase_drafts ADD CONSTRAINT ck_purchase_draft_source CHECK (source IN (
    'PASTED_TEXT', 'SHORTCUT', 'APP_INTENT', 'WALLET',
    'SHARED_TEXT', 'IMAGE', 'PDF', 'NOTIFICATION'
));
