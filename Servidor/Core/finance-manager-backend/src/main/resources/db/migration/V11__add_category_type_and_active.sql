ALTER TABLE categories
    ADD COLUMN type VARCHAR(10),
    ADD COLUMN active BOOLEAN,
    ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

UPDATE categories
SET type = 'EXPENSE', active = TRUE;

ALTER TABLE categories
    ALTER COLUMN type SET NOT NULL,
    ALTER COLUMN type SET DEFAULT 'EXPENSE',
    ALTER COLUMN active SET NOT NULL,
    ALTER COLUMN active SET DEFAULT TRUE;

ALTER TABLE categories
    DROP CONSTRAINT uk_category_user_name;

ALTER TABLE categories
    ADD CONSTRAINT ck_categories_type CHECK (type IN ('EXPENSE', 'INCOME')),
    ADD CONSTRAINT ck_categories_name_not_blank CHECK (length(trim(name)) > 0) NOT VALID,
    ADD CONSTRAINT uk_category_user_type_name UNIQUE (user_id, type, name);

CREATE INDEX idx_categories_user_type_active_name
    ON categories (user_id, type, active, name);
