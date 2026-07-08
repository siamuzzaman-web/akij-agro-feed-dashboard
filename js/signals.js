// ==========================================================================
// signals.js — market signal cards, dependency cards, secondary tables
// ==========================================================================
import { AppState } from "./state.js";
import { fmtUSD, fmtPct, riskLabel } from "./utils.js";

const SIGNAL_ICONS = {
  go: `<path d="M20 6L9 17l-5-5"/>`,
  monitor: `<circle cx="12" cy="12" r="3"/><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/>`,
  risk: `<path d="M12 9v4m0 4h.01M10.3 3.9L2.7 17a2 2 0 001.7 3h15.2a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/>`,
};

function signalToClass(signal) {
  if (signal === "OPTIMAL") return { cls: "go", icon: "go", tone: "success" };
  if (signal === "MONITOR") return { cls: "monitor", icon: "monitor", tone: "warning" };
  return { cls: "risk", icon: "risk", tone: "danger" };
}

export function renderSignalCards(containerId, limit) {
  const el = document.getElementById(containerId);
  const { signals } = AppState.raw.signals;
  const ids = new Set(AppState.filtered.map((p) => p.id));
  let list = signals.filter((s) => ids.has(s.productId));
  if (limit) list = list.slice(0, limit);

  if (!list.length) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">No signals for the current filter.</div>`;
    return;
  }

  el.innerHTML = list.map((s) => {
    const meta = signalToClass(s.signal);
    const label = s.signal === "OPTIMAL" ? "GO" : s.signal === "MONITOR" ? "MONITOR" : "RISK";
    return `
      <div class="signal-card ${meta.cls}">
        <div class="signal-icon ${meta.tone}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${SIGNAL_ICONS[meta.icon]}</svg></div>
        <div class="signal-body">
          <span class="signal-tag ${meta.tone}">${label}</span>
          <span class="signal-title">${s.product}</span>
          <span class="signal-desc">${s.description}</span>
        </div>
      </div>`;
  }).join("");
}

export function renderDependencyGrid(containerId) {
  const el = document.getElementById(containerId);
  const list = AppState.filtered.filter((p) => !(p.cheapestCountry2 && p.cheapestCountry2 !== "-"));

  if (!list.length) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">No single-origin dependency risks in the current filter.</div>`;
    return;
  }

  el.innerHTML = list.map((p) => `
    <div class="signal-card risk">
      <div class="signal-icon danger"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a14 14 0 010 18 14 14 0 010-18z"/><path d="M3 12h18"/></svg></div>
      <div class="signal-body">
        <span class="signal-tag danger">Single Origin</span>
        <span class="signal-title">${p.product}</span>
        <span class="signal-desc">Only ${p.cheapestCountry1 || "one country"} is quoted (${fmtUSD(p.price1)}/MT). No alternate origin on file to benchmark against.</span>
      </div>
    </div>`).join("");
}

export function renderSupplierTable(tableId) {
  const table = document.getElementById(tableId);
  const { suppliers } = AppState.raw.suppliers;
  const ids = new Set(AppState.filtered.map((p) => p.id));
  const list = suppliers.filter((s) => ids.has(s.productId)).sort((a, b) => (b.costGapPct ?? -1) - (a.costGapPct ?? -1));

  table.innerHTML = `
    <thead><tr>
      <th>Material</th><th>Akij Origin</th><th>Akij Price</th><th>Best Buy Origin</th><th>Best Buy Price</th><th>Cost Gap</th><th>Risk</th><th>Action</th>
    </tr></thead>
    <tbody>
      ${list.map((s) => `
        <tr>
          <td class="cell-strong">${s.product}</td>
          <td>${s.akijSourcingCountry || "—"}</td>
          <td>${fmtUSD(s.akijQuotedPrice)}</td>
          <td>${s.bestBuyCountry || "—"}</td>
          <td>${fmtUSD(s.bestBuyPrice)}</td>
          <td class="cell-change ${s.costGapPct > 0 ? "pos" : "neg"}">${fmtPct(s.costGapPct)}</td>
          <td><span class="cell-badge ${riskLabel(s.riskSignal).tone}">${riskLabel(s.riskSignal).label}</span></td>
          <td>${s.procurementAction}</td>
        </tr>`).join("")}
    </tbody>`;
}

export function renderRecommendationsTable(tableId) {
  const table = document.getElementById(tableId);
  const { recommendations } = AppState.raw.recommendations;
  const ids = new Set(AppState.filtered.map((p) => p.id));
  const priorityRank = { high: 0, medium: 1, low: 2 };
  const list = recommendations.filter((r) => ids.has(r.productId)).sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);

  table.innerHTML = `
    <thead><tr><th>Material</th><th>Recommended Action</th><th>Priority</th><th>Risk Signal</th><th>WoW %</th><th>Forecast Δ %</th></tr></thead>
    <tbody>
      ${list.map((r) => `
        <tr>
          <td class="cell-strong">${r.product}</td>
          <td>${r.action}</td>
          <td><span class="cell-badge ${r.color === "danger" ? "danger" : r.color === "success" ? "success" : r.color === "warning" ? "warning" : "neutral"}">${r.priority.toUpperCase()}</span></td>
          <td><span class="cell-badge ${riskLabel(r.riskSignal).tone}">${riskLabel(r.riskSignal).label}</span></td>
          <td class="cell-change ${r.wowPct > 0 ? "pos" : "neg"}">${fmtPct(r.wowPct)}</td>
          <td class="cell-change ${r.forecastDeltaPct > 0 ? "pos" : "neg"}">${fmtPct(r.forecastDeltaPct)}</td>
        </tr>`).join("")}
    </tbody>`;
}
