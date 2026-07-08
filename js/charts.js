// ==========================================================================
// charts.js — Chart.js instances for every chart on the dashboard
// ==========================================================================
import { AppState, categoryOf } from "./state.js";
import { cssVar, fmtUSD, fmtPct, heatColor } from "./utils.js";

const instances = {};

function destroy(id) {
  if (instances[id]) {
    instances[id].destroy();
    delete instances[id];
  }
}

function ctx(id) {
  if (typeof Chart === "undefined") return null;
  const el = document.getElementById(id);
  return el ? el.getContext("2d") : null;
}

if (typeof Chart !== "undefined" && Chart.defaults) {
  Chart.defaults.font.family = "Inter, sans-serif";
  Chart.defaults.color = "#64748B";
  Chart.defaults.plugins.tooltip.backgroundColor = "#0F172A";
  Chart.defaults.plugins.tooltip.titleColor = "#F8FAFC";
  Chart.defaults.plugins.tooltip.bodyColor = "#E2E8F0";
  Chart.defaults.plugins.tooltip.titleFont = { size: 12, weight: "700" };
  Chart.defaults.plugins.tooltip.bodyFont = { size: 12, weight: "500" };
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.plugins.tooltip.cornerRadius = 10;
  Chart.defaults.plugins.tooltip.boxPadding = 6;
  Chart.defaults.plugins.tooltip.displayColors = true;
  Chart.defaults.plugins.tooltip.usePointStyle = true;
  Chart.defaults.plugins.tooltip.borderColor = "rgba(255,255,255,0.08)";
  Chart.defaults.plugins.tooltip.borderWidth = 1;
}

// Vertical gradient fill for area/line charts — falls back to a flat tint if
// the canvas context isn't ready yet.
function gradientFill(chartCtx, hex, alphaTop = 0.32, alphaBottom = 0.02) {
  try {
    const { chartArea } = chartCtx.chart;
    if (!chartArea) return hex + "22";
    const g = chartCtx.chart.ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    g.addColorStop(0, hexToRgba(hex, alphaTop));
    g.addColorStop(1, hexToRgba(hex, alphaBottom));
    return g;
  } catch {
    return hex + "22";
  }
}

function hexToRgba(hex, alpha) {
  const v = hex.replace("#", "");
  const r = parseInt(v.substring(0, 2), 16), g = parseInt(v.substring(2, 4), 16), b = parseInt(v.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const PALETTE = ["#005BAC", "#00A3FF", "#16A34A", "#F59E0B", "#DC2626", "#7C3AED", "#0EA5E9", "#EA580C", "#059669", "#DB2777"];

function baseGrid() {
  return { color: cssVar("--ink-200"), drawBorder: false };
}
function baseTicks() {
  return { color: cssVar("--ink-500"), font: { size: 11 } };
}

// -------------------------------------------------------------------------
// PRICE TREND (multi-line) — used both on Dashboard & Price Analysis views
// -------------------------------------------------------------------------
export function renderPriceTrend(canvasId, monthsBack = 12) {
  const c = ctx(canvasId);
  if (!c) return;
  destroy(canvasId);

  const { months, series } = AppState.raw.history;
  const list = AppState.filtered.slice(0, 6);
  const startIdx = Math.max(0, months.length - monthsBack);
  const labels = months.slice(startIdx);

  const datasets = list.map((p, i) => ({
    label: p.product,
    data: (series[p.id] || []).slice(startIdx),
    borderColor: PALETTE[i % PALETTE.length],
    backgroundColor: (context) => gradientFill(context, PALETTE[i % PALETTE.length], i === 0 ? 0.28 : 0.1, 0.01),
    borderWidth: i === 0 ? 3 : 2,
    tension: 0.4,
    pointRadius: 0,
    pointHoverRadius: 5,
    pointHoverBackgroundColor: PALETTE[i % PALETTE.length],
    pointHoverBorderColor: "#fff",
    pointHoverBorderWidth: 2,
    fill: i === 0,
    spanGaps: true,
  }));

  instances[canvasId] = new Chart(c, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: true, position: "bottom", labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, padding: 16, font: { size: 11 } } },
        tooltip: { callbacks: { label: (t) => ` ${t.dataset.label}: ${fmtUSD(t.parsed.y)}/MT` } },
      },
      scales: {
        x: { grid: { display: false }, ticks: baseTicks() },
        y: { grid: baseGrid(), ticks: { ...baseTicks(), callback: (v) => "$" + v } },
      },
    },
  });
}

// -------------------------------------------------------------------------
// RISK DONUT
// -------------------------------------------------------------------------
export function renderRiskDonut(canvasId) {
  const c = ctx(canvasId);
  if (!c) return;
  destroy(canvasId);

  const counts = { OPTIMAL: 0, MONITOR: 0, HIGH_COST: 0, REVIEW: 0 };
  AppState.filtered.forEach((p) => (counts[p.riskSignal] = (counts[p.riskSignal] || 0) + 1));

  instances[canvasId] = new Chart(c, {
    type: "doughnut",
    data: {
      labels: ["Optimal", "Monitor", "High Cost", "Review"],
      datasets: [{
        data: [counts.OPTIMAL, counts.MONITOR, counts.HIGH_COST, counts.REVIEW],
        backgroundColor: ["#16A34A", "#F59E0B", "#DC2626", "#94A3B8"],
        borderWidth: 3,
        borderColor: cssVar("--card"),
        hoverOffset: 8,
        borderRadius: 3,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: "68%",
      plugins: { legend: { position: "bottom", labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, padding: 14, font: { size: 11 } } } },
    },
  });
}

// -------------------------------------------------------------------------
// WOW BAR
// -------------------------------------------------------------------------
export function renderWowBar(canvasId) {
  const c = ctx(canvasId);
  if (!c) return;
  destroy(canvasId);

  const list = [...AppState.filtered].sort((a, b) => (b.wowPct ?? 0) - (a.wowPct ?? 0));
  instances[canvasId] = new Chart(c, {
    type: "bar",
    data: {
      labels: list.map((p) => p.product),
      datasets: [{
        data: list.map((p) => (p.wowPct ?? 0) * 100),
        backgroundColor: list.map((p) => ((p.wowPct ?? 0) >= 0 ? "#DC2626" : "#16A34A")),
        borderRadius: 5,
        maxBarThickness: 26,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: "y",
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (t) => ` ${t.parsed.x.toFixed(1)}% WoW` } } },
      scales: {
        x: { grid: baseGrid(), ticks: { ...baseTicks(), callback: (v) => v + "%" } },
        y: { grid: { display: false }, ticks: baseTicks() },
      },
    },
  });
}

// -------------------------------------------------------------------------
// SOURCING GAP (Akij vs Best Buy)
// -------------------------------------------------------------------------
export function renderSourcingGap(canvasId) {
  const c = ctx(canvasId);
  if (!c) return;
  destroy(canvasId);

  const { suppliers } = AppState.raw.suppliers;
  const ids = new Set(AppState.filtered.map((p) => p.id));
  const list = suppliers.filter((s) => ids.has(s.productId) && s.akijQuotedPrice != null);

  instances[canvasId] = new Chart(c, {
    type: "bar",
    data: {
      labels: list.map((s) => s.product),
      datasets: [
        { label: "Akij Sourcing Price", data: list.map((s) => s.akijQuotedPrice), backgroundColor: "#005BAC", borderRadius: 5, maxBarThickness: 20 },
        { label: "Best Buy Price", data: list.map((s) => s.bestBuyPrice), backgroundColor: "#00A3FF", borderRadius: 5, maxBarThickness: 20 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, font: { size: 11 } } },
        tooltip: { callbacks: { label: (t) => ` ${t.dataset.label}: ${fmtUSD(t.parsed.y)}/MT` } } },
      scales: {
        x: { grid: { display: false }, ticks: { ...baseTicks(), maxRotation: 40, minRotation: 40 } },
        y: { grid: baseGrid(), ticks: { ...baseTicks(), callback: (v) => "$" + v } },
      },
    },
  });
}

// -------------------------------------------------------------------------
// VOLATILITY (Price Analysis)
// -------------------------------------------------------------------------
export function renderVolatility(canvasId) {
  const c = ctx(canvasId);
  if (!c) return;
  destroy(canvasId);
  const list = [...AppState.filtered]
    .filter((p) => p.wowPct != null)
    .sort((a, b) => Math.abs(b.wowPct) - Math.abs(a.wowPct));

  instances[canvasId] = new Chart(c, {
    type: "bar",
    data: {
      labels: list.map((p) => p.product),
      datasets: [{ data: list.map((p) => Math.abs(p.wowPct) * 100), backgroundColor: "#F59E0B", borderRadius: 5, maxBarThickness: 20 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: "y",
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (t) => ` ${t.parsed.x.toFixed(1)}% |WoW|` } } },
      scales: {
        x: { grid: baseGrid(), ticks: { ...baseTicks(), callback: (v) => v + "%" } },
        y: { grid: { display: false }, ticks: { ...baseTicks(), font: { size: 10 } } },
      },
    },
  });
}

// -------------------------------------------------------------------------
// FORECAST vs CURRENT
// -------------------------------------------------------------------------
export function renderForecast(canvasId) {
  const c = ctx(canvasId);
  if (!c) return;
  destroy(canvasId);
  const list = AppState.filtered.filter((p) => p.nextWkForecast != null);

  instances[canvasId] = new Chart(c, {
    type: "bar",
    data: {
      labels: list.map((p) => p.product),
      datasets: [
        { label: "Current Avg", data: list.map((p) => p.currentAvgPrice ?? p.lastWeekPrice), backgroundColor: "#94A3B8", borderRadius: 5, maxBarThickness: 18 },
        { label: "Next Week Forecast", data: list.map((p) => p.nextWkForecast), backgroundColor: "#00A3FF", borderRadius: 5, maxBarThickness: 18 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, font: { size: 11 } } } },
      scales: {
        x: { grid: { display: false }, ticks: { ...baseTicks(), maxRotation: 40, minRotation: 40 } },
        y: { grid: baseGrid(), ticks: { ...baseTicks(), callback: (v) => "$" + v } },
      },
    },
  });
}

// -------------------------------------------------------------------------
// PRICE BAR (current avg)
// -------------------------------------------------------------------------
export function renderPriceBar(canvasId) {
  const c = ctx(canvasId);
  if (!c) return;
  destroy(canvasId);
  const list = [...AppState.filtered].sort((a, b) => (b.currentAvgPrice ?? 0) - (a.currentAvgPrice ?? 0));

  instances[canvasId] = new Chart(c, {
    type: "bar",
    data: {
      labels: list.map((p) => p.product),
      datasets: [{ data: list.map((p) => p.currentAvgPrice ?? p.lastWeekPrice), backgroundColor: "#005BAC", borderRadius: 5, maxBarThickness: 22 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { ...baseTicks(), maxRotation: 45, minRotation: 45 } },
        y: { grid: baseGrid(), ticks: { ...baseTicks(), callback: (v) => "$" + v } },
      },
    },
  });
}

// -------------------------------------------------------------------------
// COUNTRY RANK
// -------------------------------------------------------------------------
export function renderCountryRank(canvasId) {
  const c = ctx(canvasId);
  if (!c) return;
  destroy(canvasId);
  const list = [...AppState.raw.countries.countries].sort((a, b) => b.rank1Count - a.rank1Count).slice(0, 10);

  instances[canvasId] = new Chart(c, {
    type: "bar",
    data: {
      labels: list.map((c) => c.country),
      datasets: [{ data: list.map((c) => c.rank1Count), backgroundColor: "#005BAC", borderRadius: 5, maxBarThickness: 22 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: "y",
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (t) => ` #1 cheapest in ${t.parsed.x} material(s)` } } },
      scales: {
        x: { grid: baseGrid(), ticks: baseTicks(), beginAtZero: true },
        y: { grid: { display: false }, ticks: baseTicks() },
      },
    },
  });
}

// -------------------------------------------------------------------------
// COUNTRY AVG PRICE
// -------------------------------------------------------------------------
export function renderCountryAvgPrice(canvasId) {
  const c = ctx(canvasId);
  if (!c) return;
  destroy(canvasId);
  const list = [...AppState.raw.countries.countries].sort((a, b) => a.avgQuotedPrice - b.avgQuotedPrice).slice(0, 10);

  instances[canvasId] = new Chart(c, {
    type: "bar",
    data: {
      labels: list.map((c) => c.country),
      datasets: [{ data: list.map((c) => c.avgQuotedPrice), backgroundColor: "#00A3FF", borderRadius: 5, maxBarThickness: 22 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: "y",
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (t) => ` ${fmtUSD(t.parsed.x)}/MT avg` } } },
      scales: {
        x: { grid: baseGrid(), ticks: { ...baseTicks(), callback: (v) => "$" + v } },
        y: { grid: { display: false }, ticks: baseTicks() },
      },
    },
  });
}

// -------------------------------------------------------------------------
// SUPPLIER COMPARISON
// -------------------------------------------------------------------------
export function renderSupplierComparison(canvasId) {
  const c = ctx(canvasId);
  if (!c) return;
  destroy(canvasId);
  const { suppliers } = AppState.raw.suppliers;
  const ids = new Set(AppState.filtered.map((p) => p.id));
  const list = suppliers.filter((s) => ids.has(s.productId) && s.akijQuotedPrice != null);

  instances[canvasId] = new Chart(c, {
    type: "bar",
    data: {
      labels: list.map((s) => s.product),
      datasets: [
        { label: "Akij Sourcing", data: list.map((s) => s.akijQuotedPrice), backgroundColor: "#005BAC", borderRadius: 5, maxBarThickness: 18 },
        { label: "Best Buy", data: list.map((s) => s.bestBuyPrice), backgroundColor: "#16A34A", borderRadius: 5, maxBarThickness: 18 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            afterBody: (items) => {
              const i = items[0].dataIndex;
              const s = list[i];
              return s.costGapPct != null ? [`Cost gap: ${fmtPct(s.costGapPct)}`] : [];
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { ...baseTicks(), maxRotation: 40, minRotation: 40 } },
        y: { grid: baseGrid(), ticks: { ...baseTicks(), callback: (v) => "$" + v } },
      },
    },
  });
}

// -------------------------------------------------------------------------
// IMPORT TREND (portfolio-average monthly line)
// -------------------------------------------------------------------------
export function renderImportTrend(canvasId) {
  const c = ctx(canvasId);
  if (!c) return;
  destroy(canvasId);

  const { months, series } = AppState.raw.history;
  const list = AppState.filtered;
  const avgSeries = months.map((_, i) => {
    const vals = list.map((p) => (series[p.id] || [])[i]).filter((v) => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  });

  instances[canvasId] = new Chart(c, {
    type: "line",
    data: {
      labels: months,
      datasets: [{
        label: "Portfolio Avg Price",
        data: avgSeries,
        borderColor: "#005BAC",
        backgroundColor: (context) => gradientFill(context, "#005BAC", 0.32, 0.02),
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: "#005BAC",
        pointHoverRadius: 6,
        pointHoverBorderColor: "#fff",
        pointHoverBorderWidth: 2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (t) => ` ${fmtUSD(t.parsed.y)}/MT avg` } } },
      scales: {
        x: { grid: { display: false }, ticks: baseTicks() },
        y: { grid: baseGrid(), ticks: { ...baseTicks(), callback: (v) => "$" + v } },
      },
    },
  });
}

// -------------------------------------------------------------------------
// RISK MATRIX (scatter: cost gap % vs |WoW| volatility)
// -------------------------------------------------------------------------
export function renderRiskMatrix(canvasId) {
  const c = ctx(canvasId);
  if (!c) return;
  destroy(canvasId);
  const { suppliers } = AppState.raw.suppliers;
  const ids = new Set(AppState.filtered.map((p) => p.id));
  const byId = Object.fromEntries(AppState.filtered.map((p) => [p.id, p]));
  const points = suppliers.filter((s) => ids.has(s.productId) && s.costGapPct != null && byId[s.productId].wowPct != null);

  const colorFor = (s) => (s.riskSignal === "HIGH_COST" || s.riskSignal === "REVIEW" ? "#DC2626" : s.riskSignal === "MONITOR" ? "#F59E0B" : "#16A34A");

  instances[canvasId] = new Chart(c, {
    type: "scatter",
    data: {
      datasets: [{
        data: points.map((s) => ({ x: s.costGapPct * 100, y: Math.abs(byId[s.productId].wowPct) * 100, label: s.product })),
        backgroundColor: points.map(colorFor),
        pointRadius: 8,
        pointHoverRadius: 10,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (t) => `${t.raw.label}: gap ${t.raw.x.toFixed(1)}%, volatility ${t.raw.y.toFixed(1)}%` } },
      },
      scales: {
        x: { title: { display: true, text: "Cost Gap vs. Best Buy (%)", color: cssVar("--ink-500"), font: { size: 11 } }, grid: baseGrid(), ticks: { ...baseTicks(), callback: (v) => v + "%" } },
        y: { title: { display: true, text: "WoW Volatility (|%|)", color: cssVar("--ink-500"), font: { size: 11 } }, grid: baseGrid(), ticks: { ...baseTicks(), callback: (v) => v + "%" } },
      },
    },
  });
}

// -------------------------------------------------------------------------
// HEATMAP (custom HTML table, not Chart.js)
// -------------------------------------------------------------------------
export function renderHeatmap(tableId) {
  const table = document.getElementById(tableId);
  const list = AppState.filtered;
  const cols = [
    { key: "wowPct", label: "WoW %" },
    { key: "momPct", label: "MoM %" },
    { key: "ytdPct", label: "YTD %" },
    { key: "yoyPct", label: "YoY %" },
  ];
  table.innerHTML = `
    <thead><tr><th>Material</th>${cols.map((c) => `<th>${c.label}</th>`).join("")}</tr></thead>
    <tbody>
      ${list.map((p) => `
        <tr>
          <td class="heatmap-row-label">${p.product}</td>
          ${cols.map((c) => {
            const v = p[c.key];
            return `<td class="heatmap-cell" style="background:${heatColor(v)}">${v != null ? (v * 100).toFixed(1) + "%" : "—"}</td>`;
          }).join("")}
        </tr>`).join("")}
    </tbody>`;
}

// -------------------------------------------------------------------------
// TREEMAP (custom HTML grid, not Chart.js)
// -------------------------------------------------------------------------
export function renderTreemap(containerId) {
  const el = document.getElementById(containerId);
  const list = [...AppState.raw.countries.countries].sort((a, b) => b.productsSourced - a.productsSourced).slice(0, 12);
  const max = Math.max(...list.map((c) => c.productsSourced));

  el.style.gridTemplateColumns = "repeat(6, 1fr)";
  el.style.gridTemplateRows = "repeat(3, 1fr)";
  el.innerHTML = list
    .map((c, i) => {
      const size = c.productsSourced / max;
      const span = size > 0.7 ? "grid-column: span 2; grid-row: span 2;" : size > 0.4 ? "grid-column: span 2;" : "";
      const color = PALETTE[i % PALETTE.length];
      return `<div class="treemap-cell" style="background:${color};${span}">
        <span class="tm-name">${c.country}</span>
        <span class="tm-value">${c.productsSourced} material(s) · #1 in ${c.rank1Count}</span>
      </div>`;
    })
    .join("");
}

export function destroyAll() {
  Object.keys(instances).forEach(destroy);
}
