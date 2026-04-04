const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkAndClean() {
  try {
    // Check current tables
    const tablesResult = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    );
    console.log("Current tables:");
    tablesResult.rows.forEach((row) => console.log("- " + row.table_name));

    // If notices table exists, drop it
    const noticesExists = await pool.query(
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notices')",
    );
    if (noticesExists.rows[0].exists) {
      await pool.query("DROP TABLE notices");
      console.log("✅ Dropped notices table");
    } else {
      console.log("ℹ️  Notices table does not exist");
    }

    // Check final state
    const finalTables = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    );
    console.log("Final tables:");
    finalTables.rows.forEach((row) => console.log("- " + row.table_name));
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

checkAndClean();
