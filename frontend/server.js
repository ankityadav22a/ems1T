const path = require("path");
const dotenv = require("dotenv");
const express = require("express");
const { Pool } = require("pg");

const envResult = dotenv.config({ path: path.resolve(__dirname, ".env") });
if (envResult.error) {
  console.warn(
    "Warning: .env file not loaded from frontend directory",
    envResult.error,
  );
}

const requiredEnv = [
  "DB_HOST",
  "DB_PORT",
  "DATABASE",
  "DB_USER",
  "DB_PASSWORD",
];
const missingEnv = requiredEnv.filter((k) => !process.env[k]);
if (missingEnv.length > 0) {
  throw new Error(`Missing required DB env vars: ${missingEnv.join(", ")}`);
}

const app = express();
const PORT = process.env.PORT || 3000;

if (typeof process.env.DB_PASSWORD !== "string") {
  throw new Error(
    "DB_PASSWORD must be a string (set in .env or environment variables)",
  );
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
app.get("/profile", (req, res) => {
  res.sendFile(path.join(__dirname, "profile.html"));
});
app.post("/profile", (req, res) => {
  res.sendFile(path.join(__dirname, "profile.html"));
});
app.get("/employee", (req, res) => {
  res.sendFile(path.join(__dirname, "employee.html"));
});
app.post("/employee", (req, res) => {
  res.sendFile(path.join(__dirname, "employee.html"));
});
app.get("/projects", (req, res) => {
  res.sendFile(path.join(__dirname, "projects.html"));
});
app.post("/projects", (req, res) => {
  res.sendFile(path.join(__dirname, "projects.html"));
});
app.get("/leaves", (req, res) => {
  res.sendFile(path.join(__dirname, "leaves.html"));
});
app.post("/leaves", (req, res) => {
  res.sendFile(path.join(__dirname, "leaves.html"));
});
app.get("/document", (req, res) => {
  res.sendFile(path.join(__dirname, "document.html"));
});
app.post("/document", (req, res) => {
  res.sendFile(path.join(__dirname, "document.html"));
});
app.get("/payroll", (req, res) => {
  res.sendFile(path.join(__dirname, "payroll.html"));
});
app.post("/payroll", (req, res) => {
  res.sendFile(path.join(__dirname, "payroll.html"));
});
app.get("/clients", (req, res) => {
  res.sendFile(path.join(__dirname, "clients.html"));
});
app.post("/clients", (req, res) => {
  res.sendFile(path.join(__dirname, "clients.html"));
});
app.get("/notice", (req, res) => {
  res.sendFile(path.join(__dirname, "notice.html"));
});
app.post("/notice", (req, res) => {
  res.sendFile(path.join(__dirname, "notice.html"));
});

// GET all documents
// ====================== DOCUMENTS API ======================

// GET all documents
app.get("/api/documents", async (req, res) => {
  try {
    const queryText =
      "SELECT id, name, type, employee, file_url, created_at FROM documents ORDER BY created_at DESC";
    const result = await pool.query(queryText);
    res.json(result.rows);
  } catch (err) {
    if (err.code === "42703") {
      // created_at may not exist in older schema; fallback gracefully
      console.warn(
        "created_at column missing; using id-based ordering fallback",
      );
      try {
        const fallback = await pool.query(
          "SELECT id, name, type, employee, file_url FROM documents ORDER BY id DESC",
        );
        return res.json(fallback.rows);
      } catch (fallbackErr) {
        console.error("Fetch documents fallback error:", fallbackErr);
        return res.status(500).json({ error: "Failed to fetch documents" });
      }
    }

    console.error("Fetch documents error:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// POST - Add new document (Improved with better error handling)
app.post("/api/documents", async (req, res) => {
  const { name, type, employee, file } = req.body;

  console.log("Received document data:", { name, type, employee, file }); // For debugging

  if (!name || !type || !employee || !file) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO documents (name, type, employee, file_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, type, employee, file],
    );

    console.log("Document inserted successfully:", result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("=== DOCUMENT INSERT FAILED ===");
    console.error("Error Code:", err.code);
    console.error("Error Message:", err.message);
    console.error("Full Error:", err);

    if (err.code === "23505") {
      return res
        .status(409)
        .json({ error: "Document with this file URL already exists" });
    }
    if (err.code === "42P01") {
      return res
        .status(500)
        .json({ error: "Table 'documents' does not exist" });
    }
    if (err.code === "42703") {
      return res
        .status(500)
        .json({ error: "Column mismatch - Check table structure" });
    }

    res.status(500).json({
      error: "Insert failed",
      details: err.message,
    });
  }
});

// DELETE document
app.delete("/api/documents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM documents WHERE id = $1 RETURNING id",
      [id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json({ message: "Document deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});
app.get("/api/notices", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM notices ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/api/notices", async (req, res) => {
  const { title, type, author, url, content } = req.body;

  if (!title || !author || !url) {
    return res.status(400).json({ error: "Required fields missing" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO notices (title, type, author, url, content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, type, author, url, content],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("INSERT NOTICE ERROR:", err);

    // 🔴 duplicate URL
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ error: "Notice with this URL already exists" });
    }

    res.status(500).json({
      error: "Insert failed",
      details: err.message,
    });
  }
});
app.delete("/api/notices/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM notices WHERE id = $1", [id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      message: "Database connected successfully",
      time: result.rows[0].now,
    });
  } catch (err) {
    console.error("Database connection error:", err);
    res
      .status(500)
      .json({ error: "Database connection failed", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});
