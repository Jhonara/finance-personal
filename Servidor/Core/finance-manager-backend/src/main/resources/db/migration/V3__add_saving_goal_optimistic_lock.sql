-- Optimistic locking prevents concurrent saving contributions from silently
-- overwriting the materialized current_amount.
ALTER TABLE saving_goals
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
