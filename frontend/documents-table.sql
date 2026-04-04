-- Create documents table for Document Management
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  employee VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_documents_name ON documents(name);
CREATE INDEX IF NOT EXISTS idx_documents_employee ON documents(employee);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);


  -- creat notice table for Document Management
CREATE TABLE IF NOT EXISTS notices (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL DEFAULT 'Notice',
  author VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL UNIQUE,
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster searches (title, author, type)
CREATE INDEX IF NOT EXISTS idx_notices_title ON notices(title);
CREATE INDEX IF NOT EXISTS idx_notices_author ON notices(author);
CREATE INDEX IF NOT EXISTS idx_notices_type ON notices(type);
CREATE INDEX IF NOT EXISTS idx_notices_url ON notices(url);  -- useful for duplicate checks 