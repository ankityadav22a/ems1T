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

async function runMigration() {
  try {
    const sql = fs.readFileSync(
      path.join(
        __dirname,
        "C:\\Users\\HP\\OneDrive\\Documents\\GitHub\\ems1T\\EMS.session.sql",
      ),
      "utf-8",
    );
    await pool.query(sql);
    console.log("✅ Migration completed successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await pool.end();
  }
}

runMigration();
