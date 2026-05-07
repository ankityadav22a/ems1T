const path = require("path");
const dotenv = require("dotenv");
const express = require("express");
const { Pool } = require("pg");
const multer = require("multer");
const fs = require("fs");

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

app.use(express.json());

const session = require("express-session");

app.use(
  session({
    secret: "ems-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 1000 * 60 * 60 * 2,
    },
  }),
);

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("Created uploads directory at:", uploadDir);
}

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Helper function to delete old image file
function deleteOldImage(imageUrl) {
  if (!imageUrl) return;

  // Extract filename from URL (e.g., /uploads/12345.png -> 12345.png)
  const filename = path.basename(imageUrl);
  const filePath = path.join(uploadDir, filename);

  // Check if file exists and delete it
  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Error deleting old image:", err);
      } else {
        console.log("Old image deleted:", filename);
      }
    });
  }
}

// ====================== API ROUTES ======================

// 🔐 LOGIN API
app.post("/api/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const result = await pool.query(
      `SELECT * FROM employees 
       WHERE email = $1 OR employee_id = $1`,
      [identifier],
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const validPassword = password === user.password;

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.session.user = {
      id: user.id,
      employee_id: user.employee_id,
      employee_name: user.employee_name,
      role: user.role,
      authority: user.authority,
      email: user.email,
    };

    res.json({
      message: "Login successful",
      user: req.session.user,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out" });
  });
});

// ====================== AUTH MIDDLEWARE ======================
const AUTH_LEVELS = {
  Owner: 4,
  Admin: 3,
  Administration: 2,
  Employee: 1,
};

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Unauthorized - Please login first" });
  }
  next();
}

function requireRole(minRole) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userRole = req.session.user.authority;

    if (!AUTH_LEVELS[userRole]) {
      return res.status(403).json({ error: "Invalid role" });
    }

    if (AUTH_LEVELS[userRole] < AUTH_LEVELS[minRole]) {
      return res.status(403).json({
        error: `Access denied. ${minRole} or higher required.`,
      });
    }

    next();
  };
}

// GET authenticated user's info
app.get("/api/me", requireAuth, (req, res) => {
  res.json({
    id: req.session.user.id,
    employee_id: req.session.user.employee_id,
    employee_name: req.session.user.employee_name || "User",
    authority: req.session.user.authority,
    email: req.session.user.email,
    role: req.session.user.role,
  });
});

// Get all employees for role management
app.get("/api/employees/role-management", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        employee_id,
        employee_name,
        role,
        authority,
        email,
        password
      FROM employees 
      ORDER BY employee_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

// Update employee authority/role
app.put(
  "/api/employees/:id/authority",
  requireRole("Admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { authority, role } = req.body;

      if (!authority) {
        return res.status(400).json({ error: "Authority is required" });
      }

      const result = await pool.query(
        `UPDATE employees 
       SET authority = $1, role = $2 
       WHERE employee_id = $3 
       RETURNING employee_id, employee_name, authority, role`,
        [authority, role || null, id],
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Employee not found" });
      }

      res.json({
        message: "Authority updated successfully",
        employee: result.rows[0],
      });
    } catch (err) {
      console.error("Update authority error:", err);
      res.status(500).json({ error: "Failed to update authority" });
    }
  },
);

// 🔐 CHANGE PASSWORD
app.post("/api/change-password", requireAuth, async (req, res) => {
  try {
    const { identifier, currentPassword, newPassword } = req.body;

    if (!identifier || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "All fields required" });
    }

    const result = await pool.query(
      `SELECT * FROM employees 
       WHERE email = $1 OR employee_id = $1`,
      [identifier],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];

    if (user.password !== currentPassword) {
      return res.status(400).json({ error: "Incorrect current password" });
    }

    await pool.query(
      `UPDATE employees SET password = $1 WHERE employee_id = $2`,
      [newPassword, user.employee_id],
    );

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ====================== DOCUMENTS API ======================
app.get("/api/documents", requireAuth, async (req, res) => {
  try {
    const queryText =
      "SELECT id, name, type, employee, file_url, created_at FROM documents ORDER BY created_at DESC";
    const result = await pool.query(queryText);
    res.json(result.rows);
  } catch (err) {
    if (err.code === "42703") {
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

app.post("/api/documents", requireRole("Admin"), async (req, res) => {
  const { name, type, employee, file } = req.body;

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

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("=== DOCUMENT INSERT FAILED ===");
    console.error("Error Code:", err.code);
    console.error("Error Message:", err.message);

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

    res.status(500).json({
      error: "Insert failed",
      details: err.message,
    });
  }
});

app.delete("/api/documents/:id", requireRole("Admin"), async (req, res) => {
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

// NOTICES API
app.get("/api/notices", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM notices ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/notices", requireRole("Admin"), async (req, res) => {
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

app.put("/api/notices/:id", requireRole("Admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, author, url, content } = req.body;

    const result = await pool.query(
      `UPDATE notices
       SET title=$1, type=$2, author=$3, url=$4, content=$5
       WHERE id=$6
       RETURNING *`,
      [title, type, author, url, content, id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Notice not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
});

app.delete("/api/notices/:id", requireRole("Admin"), async (req, res) => {
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

// Department Codes
const deptCodes = {
  IT: "01",
  HR: "02",
  Sales: "03",
  Finance: "04",
  Marketing: "05",
  Operations: "06",
  other: "07",
};

async function generateEmployeeId(department, join_date) {
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

      const check = await pool.query(
        "SELECT 1 FROM employees WHERE employee_id = $1",
        [employee_id],
      );

      if (check.rowCount === 0) return employee_id;
      serial++;
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

    let serial = 1;
    for (let i = 0; i < usedSerials.length; i++) {
      if (usedSerials[i] !== serial) {
        const padded = String(serial).padStart(4, "0");
        return `EMP${year}-${deptCode}-${padded}`;
      }
      serial++;
    }

    throw new Error("❌ No available Employee IDs (limit reached)");
  }
}

// CREATE EMPLOYEE
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
      phone,
      address,
      about,
      salary,
    } = req.body;

    if (!employee_name || !department || !join_date || !email) {
      return res.status(400).json({
        error: "employee_name, department, join_date, and email are required",
      });
    }

    const employee_id = await generateEmployeeId(department, join_date);
    const result = await pool.query(
      `INSERT INTO employees 
      (employee_id, employee_name, role, work_mode, department, join_date, password, authority, email, address, about, phone, salary, image_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING employee_id`,
      [
        employee_id,
        employee_name,
        role || "N/A",
        work_mode || "N/A",
        department,
        join_date,
        password || employee_id,
        authority || "Employee",
        email,
        address || "NA",
        about || "",
        phone || "N/A",
        salary || 0,
        null,
      ],
    );

    res.status(201).json({
      message: "Employee created successfully",
      employee_id: result.rows[0].employee_id,
    });
  } catch (err) {
    console.error("CREATE EMPLOYEE ERROR:", err);
    res.status(500).json({
      error: "Failed to create employee",
      details: err.message,
    });
  }
});

// READ ALL EMPLOYEES
app.get("/api/employees", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT employee_id, employee_name, role, work_mode, department, join_date, authority, email, phone, address, about, salary, image_url FROM employees ORDER BY join_date DESC",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ SINGLE EMPLOYEE
app.get("/api/employees/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT employee_id, employee_name, role, work_mode, department, join_date, authority, email, phone, address, about, salary, image_url FROM employees WHERE employee_id=$1",
      [req.params.id],
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// IMAGE UPLOAD API - WITH OLD IMAGE DELETION
app.post(
  "/api/upload-image",
  requireAuth,
  upload.single("image"),
  async (req, res) => {
    try {
      console.log("Upload request received");

      const { employee_id } = req.body;
      if (!employee_id) {
        return res.status(400).json({ error: "Employee ID required" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No image file uploaded" });
      }

      // Get current employee to check for existing image
      const currentEmployee = await pool.query(
        "SELECT image_url FROM employees WHERE employee_id = $1",
        [employee_id],
      );

      if (currentEmployee.rowCount === 0) {
        return res.status(404).json({ error: "Employee not found" });
      }

      const oldImageUrl = currentEmployee.rows[0].image_url;

      // Delete old image file if it exists
      if (oldImageUrl) {
        deleteOldImage(oldImageUrl);
      }

      const image_url = `/uploads/${req.file.filename}`;
      console.log("Saving new image URL:", image_url);

      const result = await pool.query(
        "UPDATE employees SET image_url = $1 WHERE employee_id = $2 RETURNING employee_id",
        [image_url, employee_id],
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Employee not found" });
      }

      res.json({ message: "Image uploaded successfully", image_url });
    } catch (err) {
      console.error("Image upload error:", err);
      res.status(500).json({ error: "Failed to upload image: " + err.message });
    }
  },
);

// UPDATE EMPLOYEE
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
      phone,
      address,
      about,
      salary,
      authority,
      password,
    } = req.body;

    const existing = await pool.query(
      "SELECT department, join_date, image_url FROM employees WHERE employee_id = $1",
      [oldId],
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const oldData = existing.rows[0];
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

    const currentUser = req.session.user;
    const target = await pool.query(
      "SELECT authority FROM employees WHERE employee_id = $1",
      [oldId],
    );
    const targetAuthority = target.rows[0].authority;

    if (currentUser.employee_id !== oldId) {
      if (currentUser.authority === "Owner") {
        // allow
      } else if (currentUser.authority === "Admin") {
        if (targetAuthority === "Owner" || targetAuthority === "Admin") {
          return res.status(403).json({
            error: "Admin cannot edit Owner or Admin",
          });
        }
      } else if (currentUser.authority === "Administration") {
        if (
          targetAuthority === "Owner" ||
          targetAuthority === "Admin" ||
          targetAuthority === "Administration"
        ) {
          return res.status(403).json({
            error: "Administration cannot edit these profiles",
          });
        }
      } else if (currentUser.authority === "Employee") {
        return res.status(403).json({
          error: "Employee cannot edit other profiles",
        });
      }
    }

    const updates = [];
    const values = [];
    let param = 1;

    if (employee_name !== undefined) {
      updates.push(`employee_name = $${param++}`);
      values.push(employee_name);
    }
    if (role !== undefined) {
      updates.push(`role = $${param++}`);
      values.push(role);
    }
    if (work_mode !== undefined) {
      updates.push(`work_mode = $${param++}`);
      values.push(work_mode);
    }
    if (department !== undefined) {
      updates.push(`department = $${param++}`);
      values.push(department);
    }
    if (join_date !== undefined) {
      updates.push(`join_date = $${param++}`);
      values.push(join_date);
    }
    if (email !== undefined) {
      updates.push(`email = $${param++}`);
      values.push(email);
    }
    if (address !== undefined) {
      updates.push(`address = $${param++}`);
      values.push(address);
    }
    if (about !== undefined) {
      updates.push(`about = $${param++}`);
      values.push(about);
    }
    if (salary !== undefined) {
      updates.push(`salary = $${param++}`);
      values.push(salary);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${param++}`);
      values.push(phone);
    }
    if (authority !== undefined) {
      updates.push(`authority = $${param++}`);
      values.push(authority);
    }
    if (password !== undefined && password.trim() !== "") {
      updates.push(`password = $${param++}`);
      values.push(password.trim());
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(newId);
    values.push(oldId);

    await pool.query(
      `UPDATE employees SET
        employee_id = $${param++},
        ${updates.join(", ")}
       WHERE employee_id = $${param}`,
      values,
    );

    res.json({
      message: "Employee updated successfully",
      old_id: oldId,
      new_id: newId,
    });
  } catch (err) {
    console.error("Update employee error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE EMPLOYEE
app.delete("/api/employees/:id", async (req, res) => {
  try {
    // Get employee image before deleting
    const employee = await pool.query(
      "SELECT image_url FROM employees WHERE employee_id = $1",
      [req.params.id],
    );

    if (employee.rowCount > 0 && employee.rows[0].image_url) {
      deleteOldImage(employee.rows[0].image_url);
    }

    await pool.query("DELETE FROM employees WHERE employee_id=$1", [
      req.params.id,
    ]);
    res.json({ message: "Employee deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LEAVES API
app.post("/api/leaves", async (req, res) => {
  try {
    const { employee_id, leave_type, from_date, to_date } = req.body;

    const emp = await pool.query(
      "SELECT id FROM employees WHERE employee_id = $1",
      [employee_id],
    );

    if (emp.rowCount === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const employee_ref = emp.rows[0].id;
    const start = new Date(from_date);
    const end = new Date(to_date);
    const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const result = await pool.query(
      `INSERT INTO leaves 
      (employee_ref, leave_type, from_date, to_date, days)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *`,
      [employee_ref, leave_type, from_date, to_date, days],
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/leaves/employee/:employee_id", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        l.id,
        e.employee_id,
        e.employee_name,
        l.leave_type,
        l.from_date,
        l.to_date,
        l.days,
        l.status
      FROM leaves l
      JOIN employees e 
      ON l.employee_ref = e.id
      WHERE e.employee_id = $1
      ORDER BY l.applied_at DESC
    `,
      [req.params.employee_id],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/leaves", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.*, e.employee_id, e.employee_name 
      FROM leaves l
      JOIN employees e ON l.employee_ref = e.id
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

// PAYROLL API
app.post("/api/payroll", async (req, res) => {
  try {
    let { employee_id, base, allowance, deduction, bonus, from_date, to_date } =
      req.body;

    if (!employee_id) {
      return res.status(400).json({ error: "Employee ID required" });
    }

    const emp = await pool.query(
      "SELECT id, salary, join_date FROM employees WHERE employee_id = $1",
      [employee_id],
    );

    if (emp.rowCount === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const employee = emp.rows[0];
    const employee_ref = employee.id;

    const lastPayroll = await pool.query(
      `SELECT to_date FROM payroll 
       WHERE employee_ref = $1 
       ORDER BY to_date DESC 
       LIMIT 1`,
      [employee_ref],
    );

    if (!from_date || !to_date) {
      let from, to;

      if (lastPayroll.rowCount === 0) {
        from = new Date(employee.join_date);
      } else {
        from = new Date(lastPayroll.rows[0].to_date);
        from.setDate(from.getDate() + 1);
      }

      to = new Date(from);
      to.setMonth(to.getMonth() + 1);

      from_date = from.toISOString().split("T")[0];
      to_date = to.toISOString().split("T")[0];
    }

    const finalBase = base !== undefined ? Number(base) : employee.salary || 0;
    const net = finalBase + (allowance || 0) + (bonus || 0) - (deduction || 0);

    const overlap = await pool.query(
      `SELECT * FROM payroll 
       WHERE employee_ref = $1 
       AND NOT (to_date < $2 OR from_date > $3)`,
      [employee_ref, to_date, from_date],
    );

    if (overlap.rowCount > 0) {
      return res.status(409).json({
        error: `Overlap with ${overlap.rows[0].from_date} → ${overlap.rows[0].to_date}`,
      });
    }

    const result = await pool.query(
      `INSERT INTO payroll 
      (employee_ref, base, allowance, deduction, bonus, net, from_date, to_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [
        employee_ref,
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

app.get("/api/payroll/employee/:employee_id", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT p.*, e.employee_id, e.employee_name
      FROM payroll p
      JOIN employees e 
      ON p.employee_ref = e.id
      WHERE e.employee_id = $1
      ORDER BY p.from_date DESC
    `,
      [req.params.employee_id],
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

// PROJECTS API
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

    for (let t of tasks || []) {
      await client.query(
        `INSERT INTO tasks (project_id, title, status, deadline)
         VALUES ($1,$2,$3,$4)`,
        [projectId, t.title, t.status, t.deadline],
      );
    }

    for (let exp of expenses || []) {
      await client.query(
        `INSERT INTO expenses (project_id, expense_name, expense_cost)
         VALUES ($1,$2,$3)`,
        [projectId, exp.name, exp.cost],
      );
    }

    for (let emp of team || []) {
      if (!emp.employee_id) continue;

      const user = await client.query(
        "SELECT id FROM employees WHERE employee_id = $1",
        [emp.employee_id],
      );

      if (user.rowCount === 0) continue;

      await client.query(
        `INSERT INTO project_team (project_id, employee_ref, work)
         VALUES ($1,$2,$3)`,
        [projectId, user.rows[0].id, emp.work || ""],
      );
    }

    await client.query("COMMIT");
    res.json({
      message: "Project created successfully",
      project_id: projectId,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Create project error:", err);
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
        `SELECT pt.*, e.employee_name, e.employee_id
         FROM project_team pt
         LEFT JOIN employees e 
         ON pt.employee_ref = e.id
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
    console.error("Get projects error:", err);
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

    await client.query("BEGIN");

    if (client_id) {
      const check = await client.query("SELECT id FROM clients WHERE id=$1", [
        client_id,
      ]);
      if (check.rowCount === 0) {
        throw new Error("Invalid client_id");
      }
    }

    await client.query(
      `UPDATE projects SET
        project_name=$1, priority=$2, start_date=$3, deadline=$4,
        resources=$5, short_description=$6, budget=$7, client_id=$8, status=$9  
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

    await client.query("DELETE FROM tasks WHERE project_id=$1", [id]);
    await client.query("DELETE FROM project_team WHERE project_id=$1", [id]);
    await client.query("DELETE FROM expenses WHERE project_id=$1", [id]);

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
      if (!emp.employee_id) continue;

      const user = await client.query(
        "SELECT id FROM employees WHERE employee_id = $1",
        [emp.employee_id],
      );

      if (user.rowCount === 0) continue;

      await client.query(
        `INSERT INTO project_team (project_id, employee_ref, work)
         VALUES ($1,$2,$3)`,
        [id, user.rows[0].id, emp.work || ""],
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Updated successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Update project error:", err);
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
    console.error("Delete project error:", err);
    res.status(500).json({ error: err.message });
  }
});

// CLIENTS API
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
    await clientDB.query("BEGIN");

    await clientDB.query(
      `INSERT INTO clients (id, name, company, location, email, phone)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, name, company, location, email, phone],
    );

    if (projectName) {
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
    res.json({ message: "Client + project created" });
  } catch (err) {
    await clientDB.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Error creating client" });
  } finally {
    clientDB.release();
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
    await clientDB.query(
      "UPDATE projects SET client_id = NULL WHERE client_id = $1",
      [id],
    );
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

// IMPORTANT: Static files middleware LAST (after all API routes)
// Change this line:
app.use(express.static(path.join(__dirname, "public")));

// To this (serving HTML files from frontend folder):
app.use(express.static(path.join(__dirname))); // Serves HTML from frontend folder

// And update uploads path:
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});
