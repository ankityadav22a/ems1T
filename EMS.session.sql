-- DROP TABLE documentations;
CREATE TABLE IF NOT EXISTS documents(
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    employee VARCHAR(100),
    file_url TEXT UNIQUE    
);
-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_documents_name ON documents(name);
CREATE INDEX IF NOT EXISTS idx_documents_employee ON documents(employee);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);

-- Add notice/blog table for the notice page API
C
REATE TABLE IF NOT EXISTS notices (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'Notice',
    author VARCHAR(255) NOT NULL,
    url TEXT NOT NULL UNIQUE,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Create indexes for faster searches (title, author, type)
CREATE INDEX IF NOT EXISTS idx_notices_title ON notices(title);
CREATE INDEX IF NOT EXISTS idx_notices_author ON notices(author);
CREATE INDEX IF NOT EXISTS idx_notices_type ON notices(type);
CREATE INDEX IF NOT EXISTS idx_notices_url ON notices(url);  -- useful for duplicate checks 


--add employee table for employee management
CREATE TABLE employees (
    employee_id VARCHAR  PRIMARY KEY,
    employee_name VARCHAR(100) NOT NULL,
    role VARCHAR(50),
    work_mode VARCHAR(20),
    department VARCHAR(50),
    join_date DATE,
    password TEXT NOT NULL,
    authority VARCHAR(20) DEFAULT 'Employee',
    email VARCHAR(100) UNIQUE NOT NULL,
    address TEXT,
    salary NUMERIC(10,2) CHECK (salary >= 0)
);  
-- Speed up logins and profile lookups
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);

-- Fast filtering by Department (useful for the ID ideas we discussed!)
CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department);

-- Speed up searches by Name (e.g., in a search bar or directory)
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(employee_name);

-- Useful for HR reports and calculating tenure
CREATE INDEX IF NOT EXISTS idx_employees_join_date ON employees(join_date);

-- Quick filtering for "Remote" vs "Office" or "Admin" vs "Employee"
CREATE INDEX IF NOT EXISTS idx_employees_work_auth ON employees(work_mode, authority);

CREATE TABLE leaves (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR NOT NULL,
    leave_type TEXT,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    days INTEGER,
    status VARCHAR(20) DEFAULT 'Pending',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_employee
      FOREIGN KEY(employee_id)
      REFERENCES employees(employee_id)
      ON DELETE CASCADE
);
-- 🔍 Fast lookup of all leaves for a specific employee (VERY IMPORTANT)
CREATE INDEX IF NOT EXISTS idx_leaves_employee_id 
ON leaves(employee_id);

-- 📅 Speed up filtering by date range (reports, calendars)
CREATE INDEX IF NOT EXISTS idx_leaves_date_range 
ON leaves(from_date, to_date);

-- 📊 Fast filtering by leave status (Pending / Approved / Rejected)
CREATE INDEX IF NOT EXISTS idx_leaves_status 
ON leaves(status);

-- 🕒 Sort and fetch recent leaves quickly (dashboard view)
CREATE INDEX IF NOT EXISTS idx_leaves_applied_at 
-- ON leaves(applied_at DESC);

-- 🔄 Combined index for employee + status (very common query)
CREATE INDEX IF NOT EXISTS idx_leaves_emp_status 
ON leaves(employee_id, status);

-- 📈 Combined index for employee + date (history + reports)
CREATE INDEX IF NOT EXISTS idx_leaves_emp_date 
ON leaves(employee_id, from_date, to_date);