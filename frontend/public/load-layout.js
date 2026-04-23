// load-layout.js - Complete layout and sidebar management

async function uploadData(url, data) {
  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const result = await response.json();
    console.log(result);
  } catch (error) {
    console.error(error.message);
  }
}

// Load sidebar menu based on user role
async function loadSidebarMenu() {
  try {
    const res = await fetch("/api/me", { credentials: "include" });
    if (!res.ok) {
      if (
        !window.location.pathname.includes("login.html") &&
        !window.location.pathname.includes("Authorization.html")
      ) {
        window.location.href = "login.html";
      }
      return;
    }

    const user = await res.json();
    const authority = user.authority;

    const menuItems = {
      Employee: [
        { name: "Dashboard", link: "index.html", icon: "📊" },
        { name: "Profile", link: "profile.html", icon: "👤" },
        { name: "Documents", link: "document.html", icon: "📄" },
        { name: "Notices", link: "notice.html", icon: "📢" },
        { name: "Settings", link: "settings.html", icon: "⚙️" },
      ],
      Administration: [
        { name: "Dashboard", link: "index.html", icon: "📊" },
        { name: "Profile", link: "profile.html", icon: "👤" },
        { name: "Employees", link: "employee.html", icon: "👥" },
        { name: "Payroll", link: "payroll.html", icon: "💰" },
        { name: "Clients", link: "clients.html", icon: "🏢" },
        { name: "Projects", link: "projects.html", icon: "📁" },
        { name: "Leaves", link: "leaves.html", icon: "🏖️" },
        { name: "Documents", link: "document.html", icon: "📄" },
        { name: "Notices", link: "notice.html", icon: "📢" },
        { name: "Settings", link: "settings.html", icon: "⚙️" },
      ],
      Admin: [
        { name: "Dashboard", link: "index.html", icon: "📊" },
        { name: "Profile", link: "profile.html", icon: "👤" },
        { name: "Employees", link: "employee.html", icon: "👥" },
        { name: "Payroll", link: "payroll.html", icon: "💰" },
        { name: "Clients", link: "clients.html", icon: "🏢" },
        { name: "Projects", link: "projects.html", icon: "📁" },
        { name: "Leaves", link: "leaves.html", icon: "🏖️" },
        { name: "Documents", link: "document.html", icon: "📄" },
        { name: "Notices", link: "notice.html", icon: "📢" },
        { name: "Authorization", link: "Authorization.html", icon: "🔒" },
        { name: "Settings", link: "settings.html", icon: "⚙️" },
      ],
      Owner: [
        { name: "Dashboard", link: "index.html", icon: "📊" },
        { name: "Profile", link: "profile.html", icon: "👤" },
        { name: "Employees", link: "employee.html", icon: "👥" },
        { name: "Payroll", link: "payroll.html", icon: "💰" },
        { name: "Clients", link: "clients.html", icon: "🏢" },
        { name: "Projects", link: "projects.html", icon: "📁" },
        { name: "Leaves", link: "leaves.html", icon: "🏖️" },
        { name: "Documents", link: "document.html", icon: "📄" },
        { name: "Notices", link: "notice.html", icon: "📢" },
        { name: "Authorization", link: "Authorization.html", icon: "🔒" },
        { name: "Settings", link: "settings.html", icon: "⚙️" },
      ],
    };

    const items = menuItems[authority] || menuItems.Employee;
    const sidebarMenu = document.getElementById("sidebarMenu");

    if (sidebarMenu) {
      sidebarMenu.innerHTML = items
        .map(
          (item) => `
        <li>
          <a href="${item.link}" class="block px-4 py-2 hover:bg-blue-600 rounded transition-colors">
            <span class="mr-2">${item.icon}</span> ${item.name}
          </a>
        </li>
      `,
        )
        .join("");

      // Highlight current page
      const currentPage = window.location.pathname.split("/").pop();
      const links = sidebarMenu.querySelectorAll("a");
      links.forEach((link) => {
        const href = link.getAttribute("href");
        if (
          href === currentPage ||
          (currentPage === "" && href === "index.html")
        ) {
          link.classList.add("bg-blue-600", "font-semibold");
        }
      });
    }
  } catch (err) {
    console.error("Failed to load sidebar:", err);
    if (
      !window.location.pathname.includes("login.html") &&
      !window.location.pathname.includes("Authorization.html")
    ) {
      window.location.href = "login.html";
    }
  }
}

// Global functions for sidebar toggle
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");

  if (sidebar && overlay) {
    sidebar.classList.toggle("-translate-x-full");
    overlay.classList.toggle("hidden");
  }
}

function handleResize() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  if (!sidebar || !overlay) return;

  if (window.innerWidth >= 768) {
    sidebar.classList.remove("-translate-x-full");
    overlay.classList.add("hidden");
  } else {
    sidebar.classList.add("-translate-x-full");
    overlay.classList.add("hidden");
  }
}

// Initialize everything when DOM is ready
document.addEventListener("DOMContentLoaded", async function () {
  // Load layout HTML
  try {
    const response = await fetch("layout.html");
    const layoutHtml = await response.text();
    document.getElementById("nav-placeholder").innerHTML = layoutHtml;

    // After layout is loaded, setup sidebar and load menu
    handleResize();

    // Add resize listener
    window.addEventListener("resize", handleResize);

    // Load sidebar menu based on user role
    await loadSidebarMenu();
  } catch (err) {
    console.error("Layout load error:", err);
  }
});
