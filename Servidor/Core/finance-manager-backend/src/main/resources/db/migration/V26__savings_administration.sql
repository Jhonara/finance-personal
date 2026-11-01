-- Existing goals, contributions, identifiers and amounts retain their meaning.
ALTER TABLE saving_goals ADD COLUMN description VARCHAR(500);
ALTER TABLE saving_goals ADD COLUMN target_date DATE;
ALTER TABLE saving_goals ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE saving_goals ADD CONSTRAINT ck_saving_goal_status CHECK (status IN ('ACTIVE', 'CLOSED', 'CANCELLED'));
ALTER TABLE saving_movements ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'CONTRIBUTION';
ALTER TABLE saving_movements ADD COLUMN description VARCHAR(255);
ALTER TABLE saving_movements ADD COLUMN request_id VARCHAR(64);
ALTER TABLE saving_movements ADD CONSTRAINT ck_saving_movement_type CHECK (type IN ('CONTRIBUTION', 'WITHDRAWAL'));
CREATE UNIQUE INDEX uk_saving_movement_request ON saving_movements(saving_goal_id, request_id) WHERE request_id IS NOT NULL;
CREATE INDEX ix_saving_movement_history ON saving_movements(saving_goal_id, movement_date DESC, id DESC);
