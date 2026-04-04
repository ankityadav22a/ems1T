-- DROP TABLE documentations;
CREATE TABLE IF NOT EXISTS documents(
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    employee VARCHAR(100),
    file_url TEXT UNIQUE    
);

-- Add notice/blog table for the notice page API
CREATE TABLE IF NOT EXISTS notices (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'Notice',
    author VARCHAR(255) NOT NULL,
    url TEXT NOT NULL UNIQUE,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);