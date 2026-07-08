// ==========================================================================
// dataLoader.js — fetches all dashboard data from /data/*.json
// ==========================================================================

const FILES = {
  products: "data/products.json",
  history: "data/history.json",
  countries: "data/countries.json",
  suppliers: "data/suppliers.json",
  signals: "data/signals.json",
  recommendations: "data/recommendations.json",
  insights: "data/ai_insights.json",
};

async function fetchJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  return res.json();
}

export async function loadAllData() {
  if (location.protocol === "file:") {
    // fetch() of local JSON is blocked by browser CORS policy under file://.
    // Surface a clear, actionable message instead of failing silently.
    throw new Error("FILE_PROTOCOL");
  }
  const entries = Object.entries(FILES);
  const results = await Promise.all(entries.map(([, path]) => fetchJson(path)));
  const data = {};
  entries.forEach(([key], i) => (data[key] = results[i]));
  return data;
}

export function showLoadError(container) {
  container.innerHTML = `
    <div class="empty-state" style="max-width:640px;margin:60px auto;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4m0 4h.01M10.3 3.9L2.7 17a2 2 0 001.7 3h15.2a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/></svg>
      <h3 style="margin:0 0 8px;color:var(--ink-900);">Can't load dashboard data over file://</h3>
      <p style="margin:0 0 6px;">Browsers block JSON fetch requests when a page is opened directly from disk.</p>
      <p style="margin:0;">Run a local server from the project folder, then open the printed address:</p>
      <p style="margin:12px 0 0;font-family:var(--font-mono);background:var(--ink-100);padding:10px 14px;border-radius:8px;display:inline-block;">python3 -m http.server 8080</p>
      <p style="margin:14px 0 0;">This dashboard also works out of the box once deployed to GitHub Pages.</p>
    </div>`;
}
