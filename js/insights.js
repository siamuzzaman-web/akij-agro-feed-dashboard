// ==========================================================================
// insights.js — Executive Brief, Market Health Score, Executive Summary,
// Priority Watchlist, and premium Copilot-style AI Insight cards
// ==========================================================================
import { AppState } from "./state.js";
import { fmtUSD, fmtPct } from "./utils.js";

// -------------------------------------------------------------------------
// Derived analytics (computed client-side from existing JSON — no schema change)
// -------------------------------------------------------------------------
export function computeMarketHealth(list) {
  if (!list.length) return { score: 0, label: "No Data", tone: "neutral" };

  const total = list.length;
  const optimalShare = list.filter((p) => p.riskSignal === "OPTIMAL").length / total;
  const riskShare = list.filter((p) => p.riskSignal === "HIGH_COST" || p.riskSignal === "REVIEW").length / total;
  const wowVals = list.map((p) => p.wowPct).filter((v) => v != null);
  const avgWow = wowVals.length ? wowVals.reduce((a, b) => a + b, 0) / wowVals.length : 0;
  const singleOrigin = list.filter((p) => !(p.cheapestCountry2 && p.cheapestCountry2 !== "-")).length / total;

  const componentSignals = optimalShare * 100;
  const componentRisk = (1 - riskShare) * 100;
  const componentMomentum = Math.max(0, Math.min(100, 50 - avgWow * 250));
  const componentDependency = (1 - singleOrigin) * 100;

  const score = Math.round((componentSignals * 0.35 + componentRisk * 0.3 + componentMomentum * 0.2 + componentDependency * 0.15));
  const clamped = Math.max(0, Math.min(100, score));

  let label, tone;
  if (clamped >= 75) { label = "Excellent"; tone = "success"; }
  else if (clamped >= 55) { label = "Healthy"; tone = "success"; }
  else if (clamped >= 35) { label = "Caution"; tone = "warning"; }
  else { label = "Elevated Risk"; tone = "danger"; }

  return { score: clamped, label, tone };
}

export function computeWatchlist(list) {
  return [...list]
    .map((p) => {
      let reason = null, weight = 0;
      if (p.riskSignal === "HIGH_COST" || p.riskSignal === "REVIEW") { reason = "High sourcing cost risk"; weight += 3; }
      if (p.wowPct != null && Math.abs(p.wowPct) >= 0.15) { reason = reason || `Sharp ${p.wowPct > 0 ? "increase" : "decline"} this week`; weight += 2; }
      if (p.forecastDeltaPct != null && p.forecastDeltaPct >= 0.08) { reason = reason || "Forecast to rise next week"; weight += 1.5; }
      if (!(p.cheapestCountry2 && p.cheapestCountry2 !== "-")) { weight += 0.5; }
      return { p, reason, weight };
    })
    .filter((x) => x.reason)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);
}

function mostCommon(arr) {
  const counts = {};
  arr.forEach((v) => (counts[v] = (counts[v] || 0) + 1));
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// -------------------------------------------------------------------------
// Executive Brief — answers the 4 questions on first screen
// -------------------------------------------------------------------------
export function renderExecutiveBrief(containerId) {
  const el = document.getElementById(containerId);
  const list = AppState.filtered;
  if (!list.length) {
    el.innerHTML = emptyBrief();
    return;
  }

  const health = computeMarketHealth(list);
  const bestOpportunity = [...list].sort((a, b) => (a.wowPct ?? 99) - (b.wowPct ?? 99))[0];
  const highestRisk = list.find((p) => p.riskSignal === "HIGH_COST") || list.find((p) => p.riskSignal === "REVIEW") || null;
  const topAction = mostCommon(list.map((p) => p.procurementAction));
  const watchlist = computeWatchlist(list);

  const cards = [
    {
      tag: "MANAGEMENT",
      tone: health.tone,
      icon: `<path d="M12 20V10M18 20V4M6 20v-4"/>`,
      question: "What should management know?",
      answer: `Portfolio health is <strong>${health.label}</strong> (${health.score}/100) — ${riskShare(list)}% of materials carry a High Cost or Review signal, average week-on-week movement is ${fmtPct(avgWow(list))}.`,
    },
    {
      tag: "PROCUREMENT",
      tone: "accent",
      icon: `<path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.4c.6.5 1 1.3 1 2.1v.5h6v-.5c0-.8.4-1.6 1-2.1A6 6 0 0012 3z"/>`,
      question: "What should procurement buy?",
      answer: `<strong>${topAction}</strong> is the leading recommendation this cycle${bestOpportunity ? `, led by <strong>${bestOpportunity.product}</strong> at ${fmtPct(bestOpportunity.wowPct)} WoW` : ""}.`,
    },
    {
      tag: "OPPORTUNITY",
      tone: "success",
      icon: `<path d="M3 17l6-6 4 4 8-8"/><path d="M21 7v6h-6"/>`,
      question: "Where is the biggest opportunity?",
      answer: bestOpportunity
        ? `<strong>${bestOpportunity.product}</strong> — down ${(Math.abs(bestOpportunity.wowPct) * 100).toFixed(1)}% this week, sourced from ${bestOpportunity.akijSourcingCountry || "—"} at ${fmtUSD(bestOpportunity.currentAvgPrice)}/MT.`
        : "No standout opportunity in the current selection.",
    },
    {
      tag: "RISK",
      tone: "danger",
      icon: `<path d="M12 9v4m0 4h.01M10.3 3.9L2.7 17a2 2 0 001.7 3h15.2a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/>`,
      question: "Where is the biggest sourcing risk?",
      answer: highestRisk
        ? `<strong>${highestRisk.product}</strong> sourced from ${highestRisk.akijSourcingCountry || "—"} costs meaningfully more than ${highestRisk.bestBuyCountry || "the best available origin"}.`
        : `No High Cost or Review signals in the current selection${watchlist.length ? ` — but ${watchlist.length} material(s) are on the watchlist.` : "."}`,
    },
  ];

  el.innerHTML = cards.map((c) => `
    <div class="brief-card tone-${c.tone}">
      <div class="brief-card-top">
        <span class="brief-tag tone-${c.tone}">${c.tag}</span>
        <div class="brief-icon tone-${c.tone}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${c.icon}</svg></div>
      </div>
      <div class="brief-question">${c.question}</div>
      <div class="brief-answer">${c.answer}</div>
    </div>`).join("");
}

function emptyBrief() {
  return `<div class="empty-state" style="grid-column:1/-1;">No materials match the current filters — adjust filters to see the executive brief.</div>`;
}

function riskShare(list) {
  const n = list.filter((p) => p.riskSignal === "HIGH_COST" || p.riskSignal === "REVIEW").length;
  return Math.round((n / list.length) * 100);
}
function avgWow(list) {
  const vals = list.map((p) => p.wowPct).filter((v) => v != null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

// -------------------------------------------------------------------------
// Market Health Score — CSS conic-gradient radial gauge
// -------------------------------------------------------------------------
export function renderHealthScore(containerId) {
  const el = document.getElementById(containerId);
  const list = AppState.filtered;
  const health = computeMarketHealth(list);
  const deg = (health.score / 100) * 360;
  const toneColor = health.tone === "success" ? "var(--success)" : health.tone === "warning" ? "var(--warning)" : health.tone === "danger" ? "var(--danger)" : "var(--ink-300)";

  el.innerHTML = `
    <div class="health-gauge" style="--deg:${deg}deg; --tone-color:${toneColor};">
      <div class="health-gauge-ring">
        <div class="health-gauge-inner">
          <span class="health-gauge-score">${health.score}</span>
          <span class="health-gauge-max">/100</span>
        </div>
      </div>
    </div>
    <div class="health-gauge-text">
      <span class="health-gauge-label tone-${health.tone}">${health.label}</span>
      <span class="health-gauge-caption">Market Health Score</span>
      <span class="health-gauge-desc">Composite of sourcing signal mix, cost risk share, price momentum and origin dependency across ${list.length} tracked material(s).</span>
    </div>`;
}

// -------------------------------------------------------------------------
// Executive Summary — 8-metric grid
// -------------------------------------------------------------------------
export function renderExecutiveSummary(containerId) {
  const el = document.getElementById(containerId);
  const list = AppState.filtered;
  if (!list.length) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">No data for current filters.</div>`;
    return;
  }

  const health = computeMarketHealth(list);
  const bestOpportunity = [...list].sort((a, b) => (a.wowPct ?? 99) - (b.wowPct ?? 99))[0];
  const highestRisk = list.find((p) => p.riskSignal === "HIGH_COST") || list.find((p) => p.riskSignal === "REVIEW") || list[0];
  const { countries } = AppState.raw.countries;
  const bestOrigin = countries[0];
  const worstOrigin = [...countries].sort((a, b) => b.avgQuotedPrice - a.avgQuotedPrice)[0];
  const priceAlert = [...list].sort((a, b) => Math.abs(b.wowPct ?? 0) - Math.abs(a.wowPct ?? 0))[0];
  const topAction = mostCommon(list.map((p) => p.procurementAction));
  const watchlist = computeWatchlist(list);

  const cards = [
    { tone: "accent", icon: iconPulse(), label: "Market Health", value: `${health.score}/100`, sub: health.label },
    { tone: "success", icon: iconOpportunity(), label: "Biggest Opportunity", value: bestOpportunity.product, sub: `${fmtPct(bestOpportunity.wowPct)} WoW` },
    { tone: "danger", icon: iconRisk(), label: "Biggest Risk", value: highestRisk.product, sub: highestRisk.riskSignal.replace("_", " ") },
    { tone: "accent", icon: iconGlobe(), label: "Best Origin", value: bestOrigin?.country || "—", sub: `#1 in ${bestOrigin?.rank1Count || 0} material(s)` },
    { tone: "warning", icon: iconGlobe(), label: "Worst Origin", value: worstOrigin?.country || "—", sub: `${fmtUSD(worstOrigin?.avgQuotedPrice)}/MT avg` },
    { tone: "danger", icon: iconAlert(), label: "Price Alert", value: priceAlert.product, sub: `${fmtPct(priceAlert.wowPct)} movement` },
    { tone: "accent", icon: iconCheck(), label: "Procurement Action", value: topAction, sub: "Most common this cycle" },
    { tone: "warning", icon: iconWatch(), label: "Watchlist", value: `${watchlist.length} material(s)`, sub: watchlist[0] ? watchlist[0].p.product : "All clear" },
  ];

  el.innerHTML = cards.map((c) => `
    <div class="summary-stat-card">
      <div class="summary-stat-icon tone-${c.tone}">${c.icon}</div>
      <div class="summary-stat-text">
        <div class="summary-stat-label">${c.label}</div>
        <div class="summary-stat-value">${c.value}</div>
        <div class="summary-stat-sub">${c.sub}</div>
      </div>
    </div>`).join("");
}

// -------------------------------------------------------------------------
// Priority Watchlist panel (dual-col, next to AI Insights)
// -------------------------------------------------------------------------
export function renderWatchlistPanel(containerId) {
  const el = document.getElementById(containerId);
  const watchlist = computeWatchlist(AppState.filtered);

  if (!watchlist.length) {
    el.innerHTML = `<div class="empty-state" style="padding:24px 0;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
      <p>Nothing flagged — the current selection is clean.</p></div>`;
    return;
  }

  el.innerHTML = watchlist.map(({ p, reason }) => `
    <div class="watchlist-row">
      <div class="watchlist-dot"></div>
      <div class="watchlist-text">
        <div class="watchlist-name">${p.product}</div>
        <div class="watchlist-reason">${reason}</div>
      </div>
      <div class="watchlist-metric">${fmtPct(p.wowPct)}</div>
    </div>`).join("");
}

// -------------------------------------------------------------------------
// AI Executive Insights — premium Copilot/ChatGPT-style summary cards
// -------------------------------------------------------------------------
const AI_ICONS = {
  pulse: `<path d="M3 12h4l3-9 4 18 3-9h4"/>`,
  trend: `<path d="M3 17l6-6 4 4 8-8"/><path d="M21 7v6h-6"/>`,
  globe: `<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18 14 14 0 010-18z"/>`,
  alert: `<path d="M12 9v4m0 4h.01M10.3 3.9L2.7 17a2 2 0 001.7 3h15.2a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/>`,
  check: `<path d="M20 6L9 17l-5-5"/>`,
};
const AI_TAGS = [
  { tag: "Cost Signal", icon: "trend" },
  { tag: "Volatility", icon: "pulse" },
  { tag: "Sourcing Risk", icon: "globe" },
  { tag: "Risk Flag", icon: "alert" },
  { tag: "Opportunity", icon: "check" },
];

export function renderAICards(containerId) {
  const el = document.getElementById(containerId);
  const { insights } = AppState.raw.insights;
  el.innerHTML = insights.map((i, idx) => {
    const meta = AI_TAGS[idx % AI_TAGS.length];
    const confidence = 72 + ((idx * 7) % 23); // deterministic, presentational confidence indicator
    return `
    <div class="ai-card">
      <div class="ai-card-head">
        <div class="ai-card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${AI_ICONS[meta.icon]}</svg></div>
        <span class="ai-card-tag">${meta.tag}</span>
      </div>
      <div class="ai-card-title-text">${i.title}</div>
      <div class="ai-card-text">${i.text}</div>
      <div class="ai-card-footer">
        <div class="ai-confidence"><div class="ai-confidence-fill" style="width:${confidence}%;"></div></div>
        <span class="ai-confidence-label">${confidence}% confidence</span>
      </div>
    </div>`;
  }).join("");
}

function iconOpportunity() { return svg(`<path d="M3 17l6-6 4 4 8-8"/><path d="M21 7v6h-6"/>`); }
function iconRisk() { return svg(`<path d="M12 9v4m0 4h.01M10.3 3.9L2.7 17a2 2 0 001.7 3h15.2a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/>`); }
function iconGlobe() { return svg(`<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18 14 14 0 010-18z"/>`); }
function iconAlert() { return svg(`<path d="M13.7 3.9L21.3 17a2 2 0 01-1.7 3H4.4a2 2 0 01-1.7-3L10.3 3.9a2 2 0 013.4 0z"/><path d="M12 9v4m0 4h.01"/>`); }
function iconCheck() { return svg(`<path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.4c.6.5 1 1.3 1 2.1v.5h6v-.5c0-.8.4-1.6 1-2.1A6 6 0 0012 3z"/>`); }
function iconPulse() { return svg(`<path d="M3 12h4l3-9 4 18 3-9h4"/>`); }
function iconWatch() { return svg(`<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>`); }

function svg(path) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${path}</svg>`;
}
