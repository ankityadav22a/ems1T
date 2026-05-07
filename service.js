// service.js - Place this in the ROOT directory (ems1T folder)
const Service = require("node-windows").Service;
const path = require("path");

// Create a new service object
const svc = new Service({
  name: "EMS Backend Service",
  description: "Employee Management System - Backend API Server",
  script: path.join(__dirname, "frontend", "server.js"), // ← Points to frontend/server.js
  nodeOptions: ["--harmony", "--max-old-space-size=4096"],
  env: {
    name: "NODE_ENV",
    value: "production",
  },
  workingDirectory: path.join(__dirname, "frontend"), // ← Sets working dir to frontend
  logpath: path.join(__dirname, "logs"),
  stdout: path.join(__dirname, "logs", "stdout.log"),
  stderr: path.join(__dirname, "logs", "stderr.log"),
});

// Create logs directory
const fs = require("fs");
if (!fs.existsSync(path.join(__dirname, "logs"))) {
  fs.mkdirSync(path.join(__dirname, "logs"));
}

// Event handlers
svc.on("install", function () {
  console.log('\n✅ Service "EMS Backend Service" installed successfully!');
  console.log("================================================");
  console.log("📝 Commands to manage the service:");
  console.log('   Start:   net start "EMS Backend Service"');
  console.log('   Stop:    net stop "EMS Backend Service"');
  console.log('   Status:  sc query "EMS Backend Service"');
  console.log("   Uninstall: node service.js uninstall");
  console.log("================================================\n");
});

svc.on("alreadyexists", function () {
  console.log(
    '⚠️ Service already exists. Use "node service.js uninstall" first.',
  );
});

svc.on("uninstall", function () {
  console.log("✅ Service uninstalled successfully!");
});

svc.on("start", function () {
  console.log("✅ Service started!");
});

svc.on("stop", function () {
  console.log("🛑 Service stopped!");
});

svc.on("error", function (err) {
  console.error("❌ Service error:", err);
});

// Command handling
const command = process.argv[2];
switch (command) {
  case "uninstall":
    console.log("🗑️ Uninstalling service...");
    svc.uninstall();
    break;
  case "start":
    console.log("▶️ Starting service...");
    svc.start();
    break;
  case "stop":
    console.log("⏹️ Stopping service...");
    svc.stop();
    break;
  case "restart":
    console.log("🔄 Restarting service...");
    svc.stop();
    setTimeout(() => svc.start(), 3000);
    break;
  default:
    console.log("📦 Installing EMS Backend Service...");
    svc.install();
}
