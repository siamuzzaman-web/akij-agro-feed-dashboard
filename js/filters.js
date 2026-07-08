// ==========================================================================
// filters.js — premium filter panel: searchable multi-selects, chips, clear all
// ==========================================================================
import { AppState, applyFilters, resetFilters, categoryOf, activeFilterCount } from "./state.js";
import { debounce } from "./utils.js";

const MULTI_FIELDS = [
  { key: "category", label: "Product Category" },
  { key: "origin", label: "Product Origin" },
  { key: "risk", label: "Risk Level", labelMap: { OPTIMAL: "Optimal", MONITOR: "Monitor", HIGH_COST: "High Cost", REVIEW: "Review" } },
  { key: "action", label: "Recommendation" },
];

export function initFilters(onChange) {
  const grid = document.getElementById("filterGrid");
  const products = AppState.raw.products.products;

  const optionsCache = {
    category: uniq(products.map((p) => categoryOf(p.product))),
    origin: uniq(products.map((p) => p.akijSourcingCountry).filter((v) => v && v !== "-")),
    risk: uniq(products.map((p) => p.riskSignal)),
    action: uniq(products.map((p) => p.procurementAction)),
  };

  const prices = products.map((p) => p.currentAvgPrice ?? p.lastWeekPrice).filter((v) => v != null);
  const priceMax = Math.ceil(Math.max(...prices) / 100) * 100;
  AppState.priceBounds = { min: 0, max: priceMax };
  AppState.filters.priceMax = priceMax;

  grid.innerHTML = `
    ${MULTI_FIELDS.map((f) => multiSelectField(f.key, f.label, optionsCache[f.key], f.labelMap)).join("")}
    ${selectField("dependency", "Dependency", ["all", "single", "multi"], depLabelMap)}
    ${selectField("year", "Year", ["all", "2024", "2025", "2026"])}
    ${selectField("quarter", "Quarter", ["all", "Q1", "Q2", "Q3", "Q4"])}
    ${selectField("month", "Month", ["all", ...["Jul25","Aug25","Sep25","Oct25","Nov25","Dec25","Jan26","Feb26","Mar26","Apr26","May26","Jun26"]])}
    ${selectField("currency", "Currency", ["USD"])}
    <div class="filter-field range-field">
      <label>Price Range (USD/MT)</label>
      <div class="dual-range">
        <input type="range" id="priceMinRange" min="0" max="${priceMax}" step="10" value="0" />
        <input type="range" id="priceMaxRange" min="0" max="${priceMax}" step="10" value="${priceMax}" />
      </div>
      <div class="range-values"><span id="priceMinLabel">$0</span><span id="priceMaxLabel">$${priceMax}</span></div>
    </div>
    <div class="filter-field">
      <label>&nbsp;</label>
      <div class="filter-actions">
        <button class="btn btn-outline btn-sm" id="resetFiltersBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 1 3 6.7M3 12v6h6"/></svg>
          Clear All
        </button>
      </div>
    </div>
  `;

  grid.querySelectorAll("select[data-filter]").forEach((sel) => {
    sel.addEventListener("change", () => {
      AppState.filters[sel.dataset.filter] = sel.value;
      applyFilters();
      renderChips();
      renderFilterSummary();
      onChange();
    });
  });

  MULTI_FIELDS.forEach((f) => wireMultiSelect(f.key, onChange));

  const minR = document.getElementById("priceMinRange");
  const maxR = document.getElementById("priceMaxRange");
  const minL = document.getElementById("priceMinLabel");
  const maxL = document.getElementById("priceMaxLabel");

  const updateRange = debounce(() => {
    let lo = Number(minR.value), hi = Number(maxR.value);
    if (lo > hi) [lo, hi] = [hi, lo];
    AppState.filters.priceMin = lo;
    AppState.filters.priceMax = hi;
    minL.textContent = "$" + lo;
    maxL.textContent = "$" + hi;
    applyFilters();
    renderChips();
    renderFilterSummary();
    onChange();
  }, 150);

  [minR, maxR].forEach((r) => r.addEventListener("input", updateRange));

  document.getElementById("resetFiltersBtn").addEventListener("click", () => {
    resetFilters();
    grid.querySelectorAll("select[data-filter]").forEach((sel) => (sel.value = "all"));
    minR.value = 0; maxR.value = priceMax;
    minL.textContent = "$0"; maxL.textContent = "$" + priceMax;
    MULTI_FIELDS.forEach((f) => refreshMultiSelectButton(f.key, f.label));
    renderChips();
    renderFilterSummary();
    onChange();
  });

  renderChips();
  renderFilterSummary();
}

function multiSelectField(key, label, options, labelMap) {
  return `
    <div class="filter-field">
      <label>${label}</label>
      <div class="multiselect" data-ms="${key}">
        <button type="button" class="multiselect-btn" id="msBtn-${key}">
          <span class="ms-btn-label" id="msLabel-${key}">All ${label}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ms-chevron"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="multiselect-panel" id="msPanel-${key}">
          <div class="multiselect-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
            <input type="text" placeholder="Search…" id="msSearch-${key}" autocomplete="off" />
          </div>
          <div class="multiselect-quick">
            <button type="button" data-act="all" data-ms-target="${key}">Select all</button>
            <button type="button" data-act="none" data-ms-target="${key}">Clear</button>
          </div>
          <div class="multiselect-options" id="msOptions-${key}">
            ${options.map((o) => optionRow(key, o, labelMap)).join("")}
          </div>
        </div>
      </div>
    </div>`;
}

function optionRow(key, value, labelMap) {
  const text = labelMap ? labelMap[value] || value : value;
  return `
    <label class="multiselect-option" data-value="${escapeAttr(value)}">
      <input type="checkbox" data-ms-check="${key}" value="${escapeAttr(value)}" />
      <span class="ms-check-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg></span>
      <span class="ms-option-text">${text}</span>
    </label>`;
}

function wireMultiSelect(key, onChange) {
  const wrap = document.querySelector(`.multiselect[data-ms="${key}"]`);
  const btn = document.getElementById(`msBtn-${key}`);
  const panel = document.getElementById(`msPanel-${key}`);
  const search = document.getElementById(`msSearch-${key}`);
  const optionsHost = document.getElementById(`msOptions-${key}`);
  const label = MULTI_FIELDS.find((f) => f.key === key).label;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = wrap.classList.contains("open");
    document.querySelectorAll(".multiselect.open").forEach((el) => el.classList.remove("open"));
    if (!isOpen) { wrap.classList.add("open"); search.focus(); }
  });

  search.addEventListener("input", () => {
    const q = search.value.trim().toLowerCase();
    optionsHost.querySelectorAll(".multiselect-option").forEach((row) => {
      const match = row.dataset.value.toLowerCase().includes(q) || row.textContent.toLowerCase().includes(q);
      row.style.display = match ? "flex" : "none";
    });
  });

  panel.querySelectorAll("button[data-act]").forEach((b) => {
    b.addEventListener("click", () => {
      const checks = optionsHost.querySelectorAll('input[type="checkbox"]');
      checks.forEach((c) => { if (c.closest(".multiselect-option").style.display !== "none") c.checked = b.dataset.act === "all"; });
      commitMultiSelect(key, label, onChange);
    });
  });

  optionsHost.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", () => commitMultiSelect(key, label, onChange));
  });

  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) wrap.classList.remove("open");
  });
}

function commitMultiSelect(key, label, onChange) {
  const checks = document.querySelectorAll(`input[data-ms-check="${key}"]:checked`);
  AppState.filters[key] = Array.from(checks).map((c) => c.value);
  refreshMultiSelectButton(key, label);
  applyFilters();
  renderChips();
  renderFilterSummary();
  onChange();
}

function refreshMultiSelectButton(key, label) {
  const el = document.getElementById(`msLabel-${key}`);
  const wrap = document.querySelector(`.multiselect[data-ms="${key}"]`);
  const selected = AppState.filters[key] || [];
  if (!el) return;
  el.textContent = selected.length === 0 ? `All ${label}` : selected.length === 1 ? selected[0] : `${selected.length} selected`;
  wrap.classList.toggle("has-value", selected.length > 0);
  document.querySelectorAll(`input[data-ms-check="${key}"]`).forEach((cb) => (cb.checked = selected.includes(cb.value)));
}

function selectField(key, label, options, labelMap) {
  const opts = options
    .map((o) => `<option value="${o}">${labelMap ? (labelMap[o] || cap(o)) : cap(o)}</option>`)
    .join("");
  return `
    <div class="filter-field">
      <label>${label}</label>
      <select data-filter="${key}">${opts}</select>
    </div>`;
}

const depLabelMap = { all: "All", single: "Single-country only", multi: "Multiple origins" };

function cap(s) {
  if (s === "all") return "All";
  return s;
}

function uniq(arr) { return [...new Set(arr)]; }
function escapeAttr(s) { return String(s).replace(/"/g, "&quot;"); }

function renderChips() {
  const el = document.getElementById("activeChips");
  const f = AppState.filters;
  const chips = [];

  MULTI_FIELDS.forEach((mf) => {
    (f[mf.key] || []).forEach((v) => {
      const text = mf.labelMap ? mf.labelMap[v] || v : v;
      chips.push({ k: mf.key, v, text: `${mf.label}: ${text}` });
    });
  });

  const pushSingle = (k, label) => {
    if (f[k] && f[k] !== "all") chips.push({ k, text: `${label}: ${f[k]}` });
  };
  pushSingle("dependency", "Dependency");
  pushSingle("year", "Year");
  pushSingle("quarter", "Quarter");
  pushSingle("month", "Month");
  if (f.search) chips.push({ k: "search", text: `Search: "${f.search}"` });

  el.innerHTML = chips
    .map(
      (c) => `<div class="filter-chip" data-k="${c.k}" data-v="${c.v ?? ""}">${c.text}<button aria-label="remove">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button></div>`
    )
    .join("");

  el.querySelectorAll(".filter-chip button").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const chipEl = e.target.closest(".filter-chip");
      const k = chipEl.dataset.k;
      const v = chipEl.dataset.v;
      const isMulti = MULTI_FIELDS.some((mf) => mf.key === k);
      if (isMulti) {
        AppState.filters[k] = (AppState.filters[k] || []).filter((x) => x !== v);
        const cb = document.querySelector(`input[data-ms-check="${k}"][value="${CSS.escape(v)}"]`);
        if (cb) cb.checked = false;
        refreshMultiSelectButton(k, MULTI_FIELDS.find((f) => f.key === k).label);
      } else if (k === "search") {
        AppState.filters.search = "";
        const s = document.getElementById("globalSearch");
        if (s) s.value = "";
        const ts = document.getElementById("tableSearch");
        if (ts) ts.value = "";
      } else {
        AppState.filters[k] = "all";
        const sel = document.querySelector(`select[data-filter="${k}"]`);
        if (sel) sel.value = "all";
      }
      applyFilters();
      renderChips();
      renderFilterSummary();
      document.dispatchEvent(new CustomEvent("filters:changed"));
    });
  });
}

function renderFilterSummary() {
  const el = document.getElementById("filterActiveCount");
  if (!el) return;
  const n = activeFilterCount();
  el.textContent = n > 0 ? `${n} active` : "No filters applied";
  el.classList.toggle("has-active", n > 0);
}

export { renderChips, renderFilterSummary };
