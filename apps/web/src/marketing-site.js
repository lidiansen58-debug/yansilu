import { initMarketingTabs } from "./marketing-tabs.js";

function normalizePath(pathname) {
  if (!pathname) return "/";
  return pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
}

function initActiveNav() {
  const currentPath = normalizePath(window.location.pathname);
  document.querySelectorAll(".site-nav a[href]").forEach((link) => {
    const href = normalizePath(link.getAttribute("href") || "");
    if (!href || href.startsWith("http")) return;
    if (href === currentPath) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function initFooterYear() {
  const year = String(new Date().getFullYear());
  document.querySelectorAll("[data-current-year]").forEach((el) => {
    el.textContent = year;
  });
}

function initHeaderState() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const sync = () => {
    header.toggleAttribute("data-scrolled", window.scrollY > 12);
  };

  sync();
  window.addEventListener("scroll", sync, { passive: true });
}

initActiveNav();
initFooterYear();
initHeaderState();
initMarketingTabs();
