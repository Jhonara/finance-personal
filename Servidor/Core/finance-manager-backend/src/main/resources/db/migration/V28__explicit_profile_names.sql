-- Preserve every legacy name and user identifier. Explicit fields are filled only by user input.
ALTER TABLE users ADD COLUMN first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN last_name VARCHAR(100);
ALTER TABLE users ADD COLUMN display_name VARCHAR(50);
