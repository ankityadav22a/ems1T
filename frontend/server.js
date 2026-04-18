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
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/profile", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "profile.html"));
});
app.post("/profile", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "profile.html"));
});
app.get("/employee", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "employee.html"));
});
app.post("/employee", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "employee.html"));
});
app.get("/projects", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "projects.html"));
});
app.post("/projects", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "projects.html"));
});
app.get("/leaves", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "leaves.html"));
});
app.post("/leaves", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "leaves.html"));
});
app.get("/document", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "document.html"));
});
app.post("/document", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "document.html"));
});
app.get("/payroll", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "payroll.html"));
});
app.post("/payroll", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "payroll.html"));
});
app.get("/clients", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "clients.html"));
});
app.post("/clients", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "clients.html"));
});
app.get("/notice", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "notice.html"));
});
app.post("/notice", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "notice.html"));
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
// 🧠 Department Codes
const deptCodes = {
  IT: "01",
  HR: "02",
  Sales: "03",
  Finance: "04",
  Marketing: "05",
  Operations: "06",
};

// 🔑 Generate Employee ID
async function generateEmployeeId(department, join_date) {
  // ✅ validate inputs
  if (!department) throw new Error("Department is required");
  if (!join_date) throw new Error("Join date is required");

  const year = new Date(join_date).getFullYear();
  const deptCode = deptCodes[department] || "99";

  const result = await pool.query(
    `SELECT COUNT(*) FROM employees 
     WHERE EXTRACT(YEAR FROM join_date) = $1 
     AND department = $2`,
    [year, department],
  );

  const count = parseInt(result.rows[0].count, 10) || 0;
  if (count < 9999) {
    let serial = count + 1;
    let employee_id;

    while (true) {
      const padded = String(serial).padStart(4, "0");
      employee_id = `EMP${year}-${deptCode}-${padded}`;

      // check if already exists
      const check = await pool.query(
        "SELECT 1 FROM employees WHERE employee_id = $1",
        [employee_id],
      );

      if (check.rowCount === 0) return employee_id; // ✅ unique मिला

      serial++; // 🔁 try next number
    }
  } else {
    const allIds = await pool.query(
      `SELECT employee_id FROM employees 
     WHERE EXTRACT(YEAR FROM join_date) = $1 
     AND department = $2`,
      [year, department],
    );

    const usedSerials = allIds.rows
      .map((row) => {
        const parts = row.employee_id.split("-");
        return parseInt(parts[2], 10);
      })
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);

    // 🔍 Find gap
    let serial = 1;
    for (let i = 0; i < usedSerials.length; i++) {
      if (usedSerials[i] !== serial) {
        const padded = String(serial).padStart(4, "0");
        return `EMP${year}-${deptCode}-${padded}`;
      }
      serial++;
    }

    // ❌ No gap found → limit exceeded
    throw new Error("❌ No available Employee IDs (limit reached)");
  }
}

//////////////////////////////////////////
// ✅ CREATE EMPLOYEE (FIXED)
//////////////////////////////////////////
app.post("/api/employees", async (req, res) => {
  try {
    const {
      employee_name,
      role,
      work_mode,
      department,
      join_date,
      password,
      authority,
      email,
      address,
      salary,
    } = req.body;

    // ✅ Validate required fields
    if (!employee_name || !department || !join_date || !email) {
      return res.status(400).json({
        error: "employee_name, department, join_date, and email are required",
      });
    }

    // ✅ Generate ID using join_date
    const employee_id = await generateEmployeeId(department, join_date);
    const result = await pool.query(
      `INSERT INTO employees 
      (employee_id, employee_name, role, work_mode, department, join_date, password, authority, email, address, salary)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING employee_id`,
      [
        employee_id,
        employee_name,
        role || "N/A",
        work_mode || "N/A",
        department,
        join_date,
        password || "employee_id",
        authority || "Employee",
        email || "test@mail.com",
        address || "NA",
        salary || 0,
      ],
    );

    res.status(201).json({
      message: "Employee created successfully",
      employee_id: result.rows[0].employee_id, // Return generated ID
    });
  } catch (err) {
    console.error("CREATE EMPLOYEE ERROR:", err);

    res.status(500).json({
      error: "Failed to create employee",
      details: err.message,
    });
  }
});

//////////////////////////////////////////
// 📖 READ ALL EMPLOYEES
//////////////////////////////////////////
app.get("/api/employees", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM employees ORDER BY join_date DESC",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////////////////////////////////
// 📖 READ SINGLE EMPLOYEE
//////////////////////////////////////////
app.get("/api/employees/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM employees WHERE employee_id=$1",
      [req.params.id],
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////////////////////////////////
// ✏️ UPDATE EMPLOYEE
//////////////////////////////////////////
app.put("/api/employees/:id", async (req, res) => {
  try {
    const oldId = req.params.id;

    const {
      employee_name,
      role,
      work_mode,
      department,
      join_date,
      email,
      address,
      salary,
    } = req.body;

    // 🔥 STEP 1: get existing employee
    const existing = await pool.query(
      "SELECT department, join_date FROM employees WHERE employee_id = $1",
      [oldId],
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const oldData = existing.rows[0];

    // 🔥 STEP 2: decide if ID should change
    let newId = oldId;

    const oldJoin = oldData.join_date
      ? new Date(oldData.join_date).toISOString().split("T")[0]
      : null;

    const dateChanged = join_date && join_date !== oldJoin;

    const deptChanged =
      department &&
      department.trim().toLowerCase() !==
        oldData.department.trim().toLowerCase();
    if (deptChanged || dateChanged) {
      newId = await generateEmployeeId(department, join_date);
    }

    // 🔥 STEP 3: update employee
    await pool.query(
      `UPDATE employees SET
        employee_id=$1,
        employee_name=$2,
        role=$3,
        work_mode=$4,
        department=$5,
        join_date=$6,
        email=$7,
        address=$8,
        salary=$9
      WHERE employee_id=$10`,
      [
        newId,
        employee_name,
        role,
        work_mode,
        department,
        join_date,
        email,
        address,
        salary,
        oldId,
      ],
    );

    res.json({
      message: "Employee updated successfully",
      old_id: oldId,
      new_id: newId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
//////////////////////////////////////////
// ❌ DELETE EMPLOYEE
//////////////////////////////////////////
app.delete("/api/employees/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM employees WHERE employee_id=$1", [
      req.params.id,
    ]);

    res.json({ message: "Employee deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});
app.post("/api/leaves", async (req, res) => {
  try {
    const { employee_id, leave_type, from_date, to_date } = req.body;

    const start = new Date(from_date);
    const end = new Date(to_date);

    const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const result = await pool.query(
      `INSERT INTO leaves 
      (employee_id, leave_type, from_date, to_date, days)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *`,
      [employee_id, leave_type, from_date, to_date, days],
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/leaves", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 

        l.id,
        l.employee_id,
        e.employee_name,
        l.leave_type,
        l.from_date,
        l.to_date,
        l.days,
        l.status
      FROM leaves l
      JOIN employees e 
      ON l.employee_id = e.employee_id
      ORDER BY l.applied_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put("/api/leaves/:id", async (req, res) => {
  try {
    await pool.query("UPDATE leaves SET status=$1 WHERE id=$2", [
      req.body.status,
      req.params.id,
    ]);

    res.json({ message: "Updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/payroll", async (req, res) => {
  try {
    let { employee_id, base, allowance, deduction, bonus, from_date, to_date } =
      req.body;

    if (!employee_id) {
      return res.status(400).json({ error: "Employee ID required" });
    }

    // ✅ Get employee salary + joining date
    const emp = await pool.query(
      "SELECT salary, join_date FROM employees WHERE employee_id = $1",
      [employee_id],
    );

    if (emp.rowCount === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const employee = emp.rows[0];

    // ✅ Get last payroll (latest)
    const lastPayroll = await pool.query(
      `SELECT to_date FROM payroll 
       WHERE employee_id = $1 
       ORDER BY to_date DESC 
       LIMIT 1`,
      [employee_id],
    );

    // =========================================================
    // ✅ DEFAULT DATE LOGIC (ONLY if user didn't send dates)
    // =========================================================
    if (!from_date || from_date === "" || !to_date || to_date === "") {
      let from, to;

      if (lastPayroll.rowCount === 0) {
        // 🟢 FIRST PAYROLL
        from = new Date(employee.join_date);
      } else {
        // 🔵 NEXT PAYROLL
        const lastTo = new Date(lastPayroll.rows[0].to_date);
        from = new Date(lastTo);
        from.setDate(from.getDate() + 1); // next day
      }

      // ➕ add 1 month
      to = new Date(from);
      to.setMonth(to.getMonth() + 1);

      // format YYYY-MM-DD
      from_date = from.toISOString().split("T")[0];
      to_date = to.toISOString().split("T")[0];
    }

    // =========================================================
    // ✅ BASE SALARY (editable + fallback)
    // =========================================================
    const finalBase = base !== undefined ? Number(base) : employee.salary || 0;

    const net = finalBase + (allowance || 0) + (bonus || 0) - (deduction || 0);

    // =========================================================
    // 🚫 OVERLAP CHECK
    // =========================================================
    const overlap = await pool.query(
      `SELECT * FROM payroll 
       WHERE employee_id = $1 
        AND NOT (to_date < $2 OR from_date > $3)`,
      [employee_id, to_date, from_date],
    );

    if (overlap.rows.length > 0) {
      return res.status(409).json({
        error: `Overlap with ${overlap.rows[0].from_date} → ${overlap.rows[0].to_date}`,
      });
    }

    // =========================================================
    // ✅ INSERT
    // =========================================================
    const result = await pool.query(
      `INSERT INTO payroll 
      (employee_id, base, allowance, deduction, bonus, net, from_date, to_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [
        employee_id,
        finalBase,
        allowance || 0,
        deduction || 0,
        bonus || 0,
        net,
        from_date,
        to_date,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("PAYROLL ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/payroll/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM payroll 
       WHERE employee_id = $1 
       ORDER BY from_date DESC`,
      [req.params.id],
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete("/api/payroll/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM payroll WHERE id=$1", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/projects", async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      project_name,
      priority,
      start_date,
      deadline,
      resources,
      short_description,
      budget,
      tasks,
      team,
      expenses,
      client_id,
      status,
    } = req.body;

    await client.query("BEGIN");

    // 1️⃣ Insert project
    if (client_id) {
      const check = await client.query("SELECT id FROM clients WHERE id=$1", [
        client_id,
      ]);

      if (check.rowCount === 0) {
        throw new Error("Invalid client_id");
      }
    }
    const proj = await client.query(
      `INSERT INTO projects 
      (project_name, priority, start_date, deadline, resources, short_description, budget, client_id, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING project_id`,
      [
        project_name || "N/A",
        priority || "Medium",
        start_date || null,
        deadline || null,
        resources || null,
        short_description || null,
        budget || null,
        client_id || null,
        status || "Not Started",
      ],
    );

    const projectId = proj.rows[0].project_id;

    // 2️⃣ Insert tasks
    for (let t of tasks || []) {
      await client.query(
        `INSERT INTO tasks (project_id, title, status, deadline)
         VALUES ($1,$2,$3,$4)`,
        [projectId, t.title, t.status, t.deadline],
      );
    }
    // 4️⃣ Insert expenses
    for (let exp of expenses || []) {
      await client.query(
        `INSERT INTO expenses (project_id, expense_name, expense_cost)
     VALUES ($1,$2,$3)`,
        [projectId, exp.name, exp.cost],
      );
    }

    // 3️⃣ Insert team (work instead of role)
    for (let emp of team || []) {
      await client.query(
        `INSERT INTO project_team (project_id, employee_id, work)
         VALUES ($1,$2,$3)`,
        [projectId, emp.id, emp.work],
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Project created successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});
app.get("/api/projects", async (req, res) => {
  try {
    const projects = await pool.query(`SELECT * FROM projects`);

    for (let p of projects.rows) {
      const tasks = await pool.query(
        "SELECT * FROM tasks WHERE project_id=$1",
        [p.project_id],
      );

      const team = await pool.query(
        `SELECT pt.*, e.employee_name 
   FROM project_team pt
   LEFT JOIN employees e 
   ON pt.employee_id = e.employee_id
   WHERE pt.project_id = $1`,
        [p.project_id],
      );
      const expenses = await pool.query(
        "SELECT * FROM expenses WHERE project_id=$1",
        [p.project_id],
      );

      p.tasks = tasks.rows;
      p.team = team.rows;
      p.expenses = expenses.rows;
    }

    res.json(projects.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
app.put("/api/projects/:id", async (req, res) => {
  const client = await pool.connect();

  try {
    const id = req.params.id;
    const {
      project_name,
      priority,
      start_date,
      deadline,
      resources,
      short_description,
      budget,
      tasks,
      team,
      expenses,
      client_id,
      status,
    } = req.body;
    if (client_id) {
      const check = await client.query("SELECT id FROM clients WHERE id=$1", [
        client_id,
      ]);

      if (check.rowCount === 0) {
        throw new Error("Invalid client_id");
      }
    }
    await client.query("BEGIN");

    // Update project
    await client.query(
      `UPDATE projects SET
       project_name=$1, priority=$2, start_date=$3, deadline=$4,
       resources=$5, short_description=$6, budget=$7, client_id=$8 ,status=$9  
       WHERE project_id=$10`,
      [
        project_name,
        priority,
        start_date,
        deadline,
        resources,
        short_description,
        budget,
        client_id,
        status,
        id,
      ],
    );

    // Delete old tasks + team
    await client.query("DELETE FROM tasks WHERE project_id=$1", [id]);
    await client.query("DELETE FROM project_team WHERE project_id=$1", [id]);
    await client.query("DELETE FROM expenses WHERE project_id=$1", [id]);

    // Reinsert
    for (let t of tasks || []) {
      await client.query(
        `INSERT INTO tasks (project_id, title, status, deadline)
         VALUES ($1,$2,$3,$4)`,
        [id, t.title, t.status, t.deadline],
      );
    }
    for (let exp of expenses || []) {
      await client.query(
        `INSERT INTO expenses (project_id, expense_name, expense_cost)
     VALUES ($1,$2,$3)`,
        [id, exp.name, exp.cost],
      );
    }

    for (let emp of team || []) {
      await client.query(
        `INSERT INTO project_team (project_id, employee_id, work)
         VALUES ($1,$2,$3)`,
        [id, emp.id, emp.work],
      );
    }

    await client.query("COMMIT");

    res.json({ message: "Updated successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});
app.delete("/api/projects/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM projects WHERE project_id=$1", [
      req.params.id,
    ]);

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET all clients + their projects
app.get("/api/clients", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.company,
        c.location,
        c.email,
        c.phone,
        COALESCE(
          json_agg(
            json_build_object(
              'project_id', p.project_id,
              'name', p.project_name,
              'start', p.start_date,
              'deadline', p.deadline,
              'budget', p.budget,
              'short_description', p.short_description,
              'status', p.status
            )
          ) FILTER (WHERE p.project_id IS NOT NULL),
          '[]'
        ) AS projects
      FROM clients c
      LEFT JOIN projects p ON c.id = p.client_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/api/clients", async (req, res) => {
  const {
    id,
    name,
    company,
    location,
    email,
    phone,
    projectName,
    startDate,
    deadline,
    budget,
    short_description,
    status,
  } = req.body;
  const clientDB = await pool.connect();
  try {
    await pool.query("BEGIN");

    await pool.query(
      `INSERT INTO clients (id, name, company, location, email, phone)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, name, company, location, email, phone],
    );

    if (projectName) {
      await pool.query(
        `INSERT INTO projects 
        (project_name, start_date, deadline, budget, status,short_description, client_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          projectName,
          startDate || null,
          deadline || null,
          budget || 0,
          status || "Not Started",
          short_description || null,
          id,
        ],
      );
    }

    await pool.query("COMMIT");

    res.json({ message: "Client + project created" });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Error creating client" });
  }
});
app.put("/api/clients/:id", async (req, res) => {
  const clientDB = await pool.connect();

  try {
    const id = req.params.id;

    const {
      name,
      company,
      location,
      email,
      phone,
      project_id,
      projectName,
      startDate,
      deadline,
      budget,
      status,
      short_description,
    } = req.body;

    await clientDB.query("BEGIN");

    // ✅ 1. Update client
    await clientDB.query(
      `UPDATE clients SET
        name = $1,
        company = $2,
        location = $3,
        email = $4,
        phone = $5
      WHERE id = $6`,
      [name, company, location, email, phone, id],
    );

    // ✅ 2. OPTIONAL project update
    if (project_id) {
      await clientDB.query(
        `UPDATE projects SET
          project_name = $1,
          start_date = $2,
          deadline = $3,
          budget = $4,
          status = $5,
          short_description = $6
        WHERE project_id = $7 AND client_id = $8`,
        [
          projectName || null,
          startDate || null,
          deadline || null,
          budget || 0,
          status || "Not Started",
          short_description || null,
          project_id,
          id,
        ],
      );
    } else if (projectName) {
      // 🆕 INSERT NEW PROJECT
      await clientDB.query(
        `INSERT INTO projects
    (project_name, start_date, deadline, budget, status, short_description, client_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          projectName,
          startDate || null,
          deadline || null,
          budget || 0,
          status || "Not Started",
          short_description || null,
          id,
        ],
      );
    }

    await clientDB.query("COMMIT");

    res.json({ message: "Client updated successfully" });
  } catch (err) {
    await clientDB.query("ROLLBACK");
    console.error("UPDATE CLIENT ERROR:", err);
    res.status(500).json({ error: "Update failed" });
  } finally {
    clientDB.release();
  }
});
app.delete("/api/clients/:id", async (req, res) => {
  const clientDB = await pool.connect();

  try {
    const id = req.params.id;

    await clientDB.query("BEGIN");

    // ✅ remove client reference
    await clientDB.query(
      "UPDATE projects SET client_id = NULL WHERE client_id = $1",
      [id],
    );

    // ✅ delete client
    await clientDB.query("DELETE FROM clients WHERE id = $1", [id]);

    await clientDB.query("COMMIT");

    res.json({ message: "Client deleted, projects preserved" });
  } catch (err) {
    await clientDB.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  } finally {
    clientDB.release();
  }
});
