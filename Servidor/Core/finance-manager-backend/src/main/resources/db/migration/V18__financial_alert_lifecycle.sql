CREATE TABLE financial_alert_states (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_key VARCHAR(180) NOT NULL,
    state VARCHAR(16) NOT NULL CHECK (state IN ('ACTIVE', 'SNOOZED', 'RESOLVED', 'ARCHIVED')),
    period VARCHAR(7),
    attention_key VARCHAR(200) NOT NULL,
    snapshot TEXT NOT NULL,
    revision BIGINT NOT NULL DEFAULT 0,
    read_at TIMESTAMP WITH TIME ZONE,
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
    checked_at TIMESTAMP WITH TIME ZONE NOT NULL,
    snoozed_until TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uk_financial_alert_event UNIQUE (user_id, event_key)
);
CREATE INDEX idx_financial_alert_user_state ON financial_alert_states(user_id, state);
-- Legacy seen markers remain for older clients. They must never hide an active condition.
