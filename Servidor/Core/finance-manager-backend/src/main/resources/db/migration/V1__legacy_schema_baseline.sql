-- Snapshot of the schema created by Servidor/BD/Migraciones.sql and Migraciones.
-- It is intentionally kept as the pre-Flyway baseline for safe adoption of
-- existing installations. Do not edit after this migration has been applied.

CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
    user_id BIGINT NOT NULL REFERENCES users(id),
    role_id BIGINT NOT NULL REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    user_id BIGINT REFERENCES users(id)
);

CREATE TABLE incomes (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    amount NUMERIC(12,2) NOT NULL,
    description VARCHAR(255),
    income_type VARCHAR(50),
    income_date DATE NOT NULL
);

CREATE TABLE expenses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    category_id BIGINT REFERENCES categories(id),
    amount NUMERIC(12,2) NOT NULL,
    description VARCHAR(255),
    payment_type VARCHAR(50),
    expense_type VARCHAR(20),
    expense_date DATE NOT NULL
);

CREATE TABLE credits (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    amount NUMERIC(12,2) NOT NULL,
    interest_rate NUMERIC(5,2) NOT NULL,
    installments INT NOT NULL,
    start_date DATE NOT NULL,
    name VARCHAR(100),
    payment_day INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE installments (
    id BIGSERIAL PRIMARY KEY,
    credit_id BIGINT REFERENCES credits(id),
    installment_number INT,
    capital NUMERIC(12,2),
    interest NUMERIC(12,2),
    total NUMERIC(12,2),
    due_date DATE,
    paid BOOLEAN DEFAULT FALSE
);

CREATE TABLE saving_goals (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    name VARCHAR(100),
    target_amount NUMERIC(12,2),
    current_amount NUMERIC(12,2) DEFAULT 0
);

CREATE TABLE saving_movements (
    id BIGSERIAL PRIMARY KEY,
    saving_goal_id BIGINT REFERENCES saving_goals(id),
    amount NUMERIC(12,2),
    movement_date DATE DEFAULT CURRENT_DATE
);

CREATE TABLE credit_schedule (
    id BIGSERIAL PRIMARY KEY,
    credit_id BIGINT NOT NULL REFERENCES credits(id),
    installment_number INT NOT NULL,
    due_date DATE NOT NULL,
    opening_balance NUMERIC(14,2) NOT NULL,
    days INT NOT NULL,
    interest NUMERIC(14,2) NOT NULL,
    principal_payment NUMERIC(14,2) NOT NULL,
    ending_balance NUMERIC(14,2) NOT NULL,
    extra_payment NUMERIC(14,2)
);

CREATE TABLE credit_payments (
    id BIGSERIAL PRIMARY KEY,
    credit_id BIGINT NOT NULL REFERENCES credits(id),
    payment_date DATE NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    extra_payment NUMERIC(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_alerts_seen (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    alert_code VARCHAR(50) NOT NULL,
    related_id BIGINT,
    seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_user_alert_seen_legacy UNIQUE (user_id, alert_code, related_id)
);

INSERT INTO roles (name) VALUES ('USER'), ('ADMIN');
