// ==========================================================================
// table.js — main detailed analysis table (sort / search / paginate / modal)
// ==========================================================================
import { AppState } from "./state.js";
import { fmtUSD, fmtPct, riskLabel } from "./utils.js";

const COLUMNS = [
  { key: "product", label: "Material", sortable: true },
  { key: "hsCode", label: "HS Code", sortable: true },
  { key: "lastWeekPrice", label: "Last Wk Price", sortable: true, fmt: (v) => fmtUSD(v) },
  { key: "currentAvgPrice", label: "Current Avg", sortable: true, fmt: (v) => fmtUSD(v), strong: true },
  { key: "wowPct", label: "WoW %", sortable: true, fmt: (v) => fmtPct(v), change: true },
  { key: "momPct", label: "MoM %", sortable: true, fmt: (v) => fmtPct(v), change: true },
  { key: "yoyPct", label: "YoY %", sortable: true, fmt: (v) => fmtPct(v), change: true },
  { key: "trend", label: "Trend", sortable: false, trend: true },
  { key: "akijSourcingCountry", label: "Akij Origin", sortable: true },
  { key: "bestBuyCountry", label: "Best Buy Origin", sortable: true },
  { key: "riskSignal", label: "Risk Signal", sortable: true, badge: true },
  { key: "procurementAction", label: "Recommendation", sortable: true },
  { key: "source", label: "Source", sortable: true, fmt: (v) => v || "-" },
];

export function renderTableToolbar(container) {
  container.innerHTML = `
    <div class="table-toolbar">
      <div class="search-box" style="max-width:260px;margin-left:0;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <input type="text" id="tableSearch" placeholder="Search table…" />
      </div>
      <button class="btn btn-outline btn-sm" id="tableExportBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/></svg>
        Export CSV
      </button>
    </div>`;
}

export function renderMainTable(tableId, onRowClick) {
  const table = document.getElementById(tableId);
  let list = [...AppState.filtered];

  const { key, dir } = AppState.tableSort;
  list.sort((a, b) => {
    let av = a[key], bv = b[key];
    if (av == null) av = dir === "asc" ? Infinity : -Infinity;
    if (bv == null) bv = dir === "asc" ? Infinity : -Infinity;
    if (typeof av === "string") return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    return dir === "asc" ? av - bv : bv - av;
  });

  const pageSize = AppState.tablePageSize;
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  AppState.tablePage = Math.min(AppState.tablePage, totalPages);
  const start = (AppState.tablePage - 1) * pageSize;
  const pageItems = list.slice(start, start + pageSize);

  table.innerHTML = `
    <thead>
      <tr>${COLUMNS.map((c) => `
        <th data-key="${c.key}" class="${AppState.tableSort.key === c.key ? "sorted" : ""}">
          ${c.label}${c.sortable ? `<span class="sort-arrow">${AppState.tableSort.key === c.key ? (AppState.tableSort.dir === "asc" ? "▲" : "▼") : "⇅"}</span>` : ""}
        </th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${pageItems.length ? pageItems.map((p) => rowHtml(p)).join("") : `<tr><td colspan="${COLUMNS.length}" style="text-align:center;padding:32px;color:var(--ink-500);">No materials match the current filters.</td></tr>`}
    </tbody>`;

  table.querySelectorAll("thead th[data-key]").forEach((th) => {
    const col = COLUMNS.find((c) => c.key === th.dataset.key);
    if (!col.sortable) return;
    th.addEventListener("click", () => {
      if (AppState.tableSort.key === col.key) {
        AppState.tableSort.dir = AppState.tableSort.dir === "asc" ? "desc" : "asc";
      } else {
        AppState.tableSort = { key: col.key, dir: "asc" };
      }
      renderMainTable(tableId, onRowClick);
    });
  });

  table.querySelectorAll("tbody tr[data-id]").forEach((tr) => {
    tr.addEventListener("click", () => onRowClick(tr.dataset.id));
  });

  renderPagination(document.getElementById("tablePagination") || createPaginationHost(table), totalPages, tableId, onRowClick);
}

function createPaginationHost(table) {
  const host = document.createElement("div");
  host.id = "tablePagination";
  host.className = "pagination";
  table.closest(".table-scroll").after(host);
  return host;
}

function renderPagination(host, totalPages, tableId, onRowClick) {
  const cur = AppState.tablePage;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);

  host.innerHTML = `
    <span>Page ${cur} of ${totalPages} · ${AppState.filtered.length} materials</span>
    <div class="pages">
      <button class="page-btn" ${cur === 1 ? "disabled" : ""} data-p="${cur - 1}">‹</button>
      ${pages.map((p) => `<button class="page-btn ${p === cur ? "active" : ""}" data-p="${p}">${p}</button>`).join("")}
      <button class="page-btn" ${cur === totalPages ? "disabled" : ""} data-p="${cur + 1}">›</button>
    </div>`;

  host.querySelectorAll("button[data-p]").forEach((btn) => {
    btn.addEventListener("click", () => {
      AppState.tablePage = Number(btn.dataset.p);
      renderMainTable(tableId, onRowClick);
    });
  });
}

function rowHtml(p) {
  return `<tr data-id="${p.id}">
    ${COLUMNS.map((c) => {
      if (c.key === "product") return `<td class="cell-strong">${p.product}</td>`;
      if (c.trend) {
        const arrow = p.trend === "up" ? "▲" : p.trend === "down" ? "▼" : "—";
        return `<td><span class="trend-arrow ${p.trend}">${arrow}</span></td>`;
      }
      if (c.badge) {
        const r = riskLabel(p.riskSignal);
        return `<td><span class="cell-badge ${r.tone}">${r.label}</span></td>`;
      }
      if (c.change) {
        const v = p[c.key];
        const cls = v == null ? "" : v >= 0 ? "pos" : "neg";
        return `<td class="cell-change ${cls}">${c.fmt(v)}</td>`;
      }
      const raw = p[c.key];
      const val = c.fmt ? c.fmt(raw) : raw ?? "—";
      return `<td class="${c.strong ? "cell-strong" : ""}">${val}</td>`;
    }).join("")}
  </tr>`;
}

export function getColumns() {
  return COLUMNS;
}
