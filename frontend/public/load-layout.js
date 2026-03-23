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

document.addEventListener("DOMContentLoaded", function () {
  fetch("layout.html")
    .then((res) => res.text())
    .then((data) => {
      document.getElementById("nav-placeholder").innerHTML = data;
      handleResize(); // Force hide on mobile load

      // Remove any persistent 'active' color logic
      const menuLinks = document.querySelectorAll("#sidebar a");
      menuLinks.forEach((link) => {
        // Remove bg-blue-600 or similar on click
        link.addEventListener("click", (e) => {
          menuLinks.forEach((l) =>
            l.classList.remove("bg-blue-600", "font-semibold"),
          );
          // Do NOT add any active class
        });
      });
    })
    .catch((err) => console.error("Layout load error:", err));
});

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

window.addEventListener("resize", handleResize);
