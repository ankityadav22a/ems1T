-- DROP TABLE documentations;
CREATE TABLE IF NOT EXISTS documentaions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    author VARCHAR(100),
    url TEXT
);