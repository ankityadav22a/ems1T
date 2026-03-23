require("dotenv").config();
const express = require("express");
const path = require("path");
const pg = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json);

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
