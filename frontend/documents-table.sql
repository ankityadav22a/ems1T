-- =============================================
-- EMS Database Schema - Fixed Version
-- Run this script in your 'test' database (public schema)
-- =============================================
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,  -- ✅ NEW PRIMARY KEY
    employee_id VARCHAR UNIQUE NOT NULL,  -- ✅ frontend ID
    employee_name VARCHAR(100) NOT NULL,
    role VARCHAR(50),
    work_mode VARCHAR(20),
    department VARCHAR(50),
    join_date DATE,
    password TEXT NOT NULL,
    authority VARCHAR(20) DEFAULT 'Employee',
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    about TEXT,
    salary NUMERIC(10,2) CHECK (salary >= 0)
);
-- 🔍 Search by employee_id (login / lookup)
CREATE INDEX IF NOT EXISTS idx_employees_employee_id 
ON employees(employee_id);

-- 🔍 Search by name (UI search)
CREATE INDEX IF NOT EXISTS idx_employees_name 
ON employees(employee_name);

-- 🏢 Department filtering
CREATE INDEX IF NOT EXISTS idx_employees_department 
ON employees(department);

-- 📅 Joining date sorting / filtering
CREATE INDEX IF NOT EXISTS idx_employees_join_date 
ON employees(join_date DESC);

-- ⚙️ Authority + role (admin panel filters)
CREATE INDEX IF NOT EXISTS idx_employees_authority_role 
ON employees(authority, role);

-- 🔍 Work mode filtering
CREATE INDEX IF NOT EXISTS idx_employees_work_mode 
ON employees(work_mode);

-- 💰 Salary filtering (optional analytics)
CREATE INDEX IF NOT EXISTS idx_employees_salary 
ON employees(salary);
CREATE TABLE IF NOT EXISTS  leaves (
    id SERIAL PRIMARY KEY,
    employee_ref INT NOT NULL,  -- ✅ FK to ID
    leave_type TEXT,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    days INTEGER,
    status VARCHAR(20) DEFAULT 'Pending',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_employee 
      FOREIGN KEY(employee_ref) 
      REFERENCES employees(id) 
      ON DELETE CASCADE
);
-- 🔗 FK index (VERY IMPORTANT for joins)
CREATE INDEX IF NOT EXISTS idx_leaves_employee_ref 
ON leaves(employee_ref);

-- 📅 Date range filtering
CREATE INDEX IF NOT EXISTS idx_leaves_date_range 
ON leaves(from_date, to_date);

-- 📊 Status filtering (Pending / Approved)
CREATE INDEX IF NOT EXISTS idx_leaves_status 
ON leaves(status);

-- ⏱ Latest leaves (dashboard)
CREATE INDEX IF NOT EXISTS idx_leaves_applied_at 
ON leaves(applied_at DESC);

-- 🔗 Employee + status (user dashboard)
CREATE INDEX IF NOT EXISTS idx_leaves_emp_status 
ON leaves(employee_ref, status);

-- 🔗 Employee + date (history queries)
CREATE INDEX IF NOT EXISTS idx_leaves_emp_date 
ON leaves(employee_ref, from_date, to_date);
CREATE TABLE IF NOT EXISTS payroll (
    id SERIAL PRIMARY KEY,
    employee_ref INT NOT NULL,  -- ✅ FIXED
    base INTEGER DEFAULT 0,
    allowance INTEGER DEFAULT 0,
    deduction INTEGER DEFAULT 0,
    bonus INTEGER DEFAULT 0,
    net INTEGER,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_employee_payroll
      FOREIGN KEY (employee_ref)
      REFERENCES employees(id)
      ON DELETE CASCADE
);
-- 🔗 FK index (MOST IMPORTANT)
CREATE INDEX IF NOT EXISTS idx_payroll_employee_ref 
ON payroll(employee_ref);

-- 📅 Date range filtering
CREATE INDEX IF NOT EXISTS idx_payroll_date_range 
ON payroll(from_date, to_date);

-- ⏱ Latest payroll first
CREATE INDEX IF NOT EXISTS idx_payroll_created_at 
ON payroll(created_at DESC);

-- 🔗 Employee + date range (OVERLAP CHECK)
CREATE INDEX IF NOT EXISTS idx_payroll_emp_date 
ON payroll(employee_ref, from_date, to_date);

-- 📊 Dashboard (latest salary per employee)
CREATE INDEX IF NOT EXISTS idx_payroll_emp_created 
ON payroll(employee_ref, created_at DESC);

-- 💰 Net salary filtering
CREATE INDEX IF NOT EXISTS idx_payroll_net 
ON payroll(net);

CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    company VARCHAR(150),
    location VARCHAR(150),
    email VARCHAR(150),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    employee VARCHAR(100),
    file_url TEXT UNIQUE    
);

CREATE INDEX IF NOT EXISTS idx_documents_name ON documents(name);
CREATE INDEX IF NOT EXISTS idx_documents_employee ON documents(employee);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);

-- Notices Table
CREATE TABLE IF NOT EXISTS notices (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'Notice',
    author VARCHAR(255) NOT NULL,
    url TEXT NOT NULL UNIQUE,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notices_title ON notices(title);
CREATE INDEX IF NOT EXISTS idx_notices_author ON notices(author);
CREATE INDEX IF NOT EXISTS idx_notices_type ON notices(type);
CREATE INDEX IF NOT EXISTS idx_notices_url ON notices(url);



CREATE TABLE IF NOT EXISTS projects (
  project_id SERIAL PRIMARY KEY,
  project_name TEXT  NOT NULL,
  priority TEXT,
  start_date DATE,
  deadline DATE,
  resources TEXT,
  short_description TEXT,
  budget NUMERIC,

  status VARCHAR(20) DEFAULT 'Upcoming',
  client_id VARCHAR(10),

  CONSTRAINT fk_client
    FOREIGN KEY (client_id)
    REFERENCES clients(id)
    ON DELETE SET NULL,
   CONSTRAINT unique_project_per_client UNIQUE (project_name, client_id)

);
-- 🔍 Search by project name (most common UI search)
CREATE INDEX IF NOT EXISTS idx_projects_name 
ON projects(project_name);

-- 📊 Priority filtering (dashboard filters)
CREATE INDEX IF NOT EXISTS idx_projects_priority 
ON projects(priority);

-- 📅 Date range filtering (reports, timelines)
CREATE INDEX IF NOT EXISTS idx_projects_dates 
ON projects(start_date, deadline);

-- ⏱ Sorting by latest projects
CREATE INDEX IF NOT EXISTS idx_projects_start_date 
ON projects(start_date DESC);

-- 💰 Budget filtering (high/low budget projects)
CREATE INDEX IF NOT EXISTS idx_projects_budget 
ON projects(budget);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(project_id) ON DELETE CASCADE,
  title TEXT,
  status TEXT,
  deadline DATE
);
-- 🔗 Project based fetch (MOST IMPORTANT)
CREATE INDEX IF NOT EXISTS idx_tasks_project_id 
ON tasks(project_id);

-- 📊 Status filtering (Ongoing / Complete / Upcoming)
CREATE INDEX IF NOT EXISTS idx_tasks_status 
ON tasks(status);

-- 📅 Task deadline filtering
CREATE INDEX IF NOT EXISTS idx_tasks_deadline 
ON tasks(deadline);

-- 🔗 Project + status (used in progress calculation)
CREATE INDEX IF NOT EXISTS idx_tasks_project_status 
ON tasks(project_id, status);

-- 🔗 Project + deadline (timeline queries)
CREATE INDEX IF NOT EXISTS idx_tasks_project_deadline 
ON tasks(project_id, deadline);

CREATE TABLE IF NOT EXISTS project_team (
  id SERIAL PRIMARY KEY,

  project_id INT REFERENCES projects(project_id) ON DELETE CASCADE,

  employee_ref INT NOT NULL,  -- ✅ FIXED

  work TEXT,

  CONSTRAINT fk_employee_project
    FOREIGN KEY (employee_ref)
    REFERENCES employees(id)
    ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_project_team_employee_ref 
ON project_team(employee_ref);

CREATE INDEX IF NOT EXISTS idx_project_team_project_id 
ON project_team(project_id);

CREATE INDEX IF NOT EXISTS idx_project_team_emp_proj 
ON project_team(employee_ref, project_id);

CREATE INDEX IF NOT EXISTS idx_project_team_work 
ON project_team(work);

CREATE INDEX IF NOT EXISTS idx_project_team_emp_proj_desc 
ON project_team(employee_ref, project_id DESC);

CREATE TABLE IF NOT EXISTS expenses (
  expense_id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  expense_name TEXT NOT NULL,
  expense_cost NUMERIC NOT NULL,

  -- 🔗 Foreign Key Relation
  CONSTRAINT fk_project
    FOREIGN KEY (project_id)
    REFERENCES projects(project_id)
    ON DELETE CASCADE
);

-- 🔗 Project-wise lookup (core)
CREATE INDEX IF NOT EXISTS idx_expenses_project 
ON expenses(project_id);

-- 📊 Latest expenses per project
CREATE INDEX IF NOT EXISTS idx_expenses_project_desc 
ON expenses(project_id, expense_id DESC);

-- 🔍 Search by name
CREATE INDEX IF NOT EXISTS idx_expenses_name 
ON expenses(expense_name);

-- 💰 Cost filtering
CREATE INDEX IF NOT EXISTS idx_expenses_cost 
ON expenses(expense_cost);