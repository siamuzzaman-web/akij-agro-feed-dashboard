// ==========================================================================
// theme.js — dark mode, sidebar collapse, mobile nav, view switching
// ==========================================================================
import { AppState } from "./state.js";

const VIEW_TITLES = {
  dashboard: "Executive Dashboard",
  price: "Price Analysis",
  country: "Country Analysis",
  supplier: "Supplier Analysis",
  dependency: "Import Dependency",
  signals: "Market Signals",
  recommendations: "Recommendations",
  ai: "AI Insights",
  settings: "Settings",
};

export function initTheme() {
  const saved = localStorage.getItem("akij-theme");
  if (saved === "dark") setTheme("dark");

  document.getElementById("darkModeToggle").addEventListener("click", () => {
    setTheme(AppState.theme === "dark" ? "light" : "dark");
  });
}

function setTheme(theme) {
  AppState.theme = theme;
  document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
  localStorage.setItem("akij-theme", theme);
  document.dispatchEvent(new CustomEvent("theme:changed"));
}

export function initSidebar() {
  const shell = document.getElementById("appShell");
  document.getElementById("collapseBtn").addEventListener("click", () => {
    shell.classList.toggle("sidebar-collapsed");
    AppState.sidebarCollapsed = shell.classList.contains("sidebar-collapsed");
  });
  document.getElementById("mobileMenuBtn").addEventListener("click", () => {
    shell.classList.toggle("mobile-open");
  });
}

export function initNav(onNavigate) {
  const items = document.querySelectorAll(".nav-item[data-view]");
  items.forEach((item) => {
    item.addEventListener("click", () => {
      items.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
      const view = item.dataset.view;
      document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
      document.getElementById(`view-${view}`).classList.add("active");
      document.getElementById("pageTitle").textContent = VIEW_TITLES[view] || "Dashboard";
      document.getElementById("appShell").classList.remove("mobile-open");
      onNavigate(view);
    });
  });
}
