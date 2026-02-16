CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_roles (
    user_id INT REFERENCES users(id),
    role_id INT REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    user_id INT REFERENCES users(id)
);

CREATE TABLE incomes (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    amount NUMERIC(12,2) NOT NULL,
    description VARCHAR(255),
    income_type VARCHAR(50), -- SALARY, EXTRA
    income_date DATE NOT NULL
);

CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    category_id INT REFERENCES categories(id),
    amount NUMERIC(12,2) NOT NULL,
    description VARCHAR(255),
    payment_type VARCHAR(50), -- CASH, CARD, CREDIT
    expense_type VARCHAR(20), -- FIXED, VARIABLE
    expense_date DATE NOT NULL
);

CREATE TABLE credits (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    amount NUMERIC(12,2) NOT NULL,
    interest_rate NUMERIC(5,2) NOT NULL,
    installments INT NOT NULL,
    start_date DATE NOT NULL
);

CREATE TABLE installments (
    id SERIAL PRIMARY KEY,
    credit_id INT REFERENCES credits(id),
    installment_number INT,
    capital NUMERIC(12,2),
    interest NUMERIC(12,2),
    total NUMERIC(12,2),
    due_date DATE,
    paid BOOLEAN DEFAULT FALSE
);

CREATE TABLE saving_goals (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    name VARCHAR(100),
    target_amount NUMERIC(12,2),
    current_amount NUMERIC(12,2) DEFAULT 0
);

CREATE TABLE saving_movements (
    id SERIAL PRIMARY KEY,
    saving_goal_id INT REFERENCES saving_goals(id),
    amount NUMERIC(12,2),
    movement_date DATE DEFAULT CURRENT_DATE
);

INSERT INTO roles (name) VALUES ('USER'), ('ADMIN');

