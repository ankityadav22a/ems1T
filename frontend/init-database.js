const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function initDatabase() {
  try {
    console.log("Initializing database tables...\n");

    // Create documents table
    const createDocuments = `
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        employee VARCHAR(255) NOT NULL,
        file_url VARCHAR(500) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_documents_name ON documents(name);
      CREATE INDEX IF NOT EXISTS idx_documents_employee ON documents(employee);
      CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
    `;

    // Create notices table
    const createNotices = `
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
    `;

    // Execute documents table
    const docStatements = createDocuments.split(";").filter((s) => s.trim());
    for (const stmt of docStatements) {
      if (stmt.trim()) {
        await pool.query(stmt);
      }
    }
    console.log("✅ Documents table created");

    // Execute notices table
    const noticeStatements = createNotices.split(";").filter((s) => s.trim());
    for (const stmt of noticeStatements) {
      if (stmt.trim()) {
        await pool.query(stmt);
      }
    }
    console.log("✅ Notices table created");

    // Verify tables exist
    const result = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    );
    console.log("\n✅ Database initialized successfully!");
    console.log("   Tables:", result.rows.map((r) => r.table_name).join(", "));
  } catch (err) {
    console.error("❌ Database initialization failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDatabase();
