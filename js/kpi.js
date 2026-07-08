// ==========================================================================
// kpi.js — renders the executive KPI card row (premium: sparkline, trend
// arrow, tooltip, vs. previous period, and a one-line explanation)
// ==========================================================================
import { AppState } from "./state.js";
import { fmtUSD, fmtPct } from "./utils.js";

const ICONS = {
  price: `<path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>`,
  trend: `<path d="M3 17l6-6 4 4 8-8"/><path d="M21 7v6h-6"/>`,
  high: `<path d="M18 15l-6-6-6 6"/>`,
  low: `<path d="M6 9l6 6 6-6"/>`,
  volatility: `<path d="M3 12h4l3-9 4 18 3-9h4"/>`,
  dependency: `<circle cx="12" cy="12" r="9"/><path d="M12 3a14 14 0 010 18 14 14 0 010-18z"/><path d="M3 12h18"/>`,
  risk: `<path d="M12 9v4m0 4h.01M10.3 3.9L2.7 17a2 2 0 001.7 3h15.2a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/>`,
  reco: `<path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.4c.6.5 1 1.3 1 2.1v.5h6v-.5c0-.8.4-1.6 1-2.1A6 6 0 0012 3z"/>`,
};

function sparkPath(values, w = 76, h = 28) {
  const clean = values.filter((v) => v != null);
  if (clean.length < 2) return "";
  const min = Math.min(...clean), max = Math.max(...clean);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * step;
      const y = v == null ? h / 2 : h - ((v - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function card({ icon, tone, label, value, unit, delta, deltaDir, spark, tooltip, compare, explain }) {
  const sparkSvg = spark
    ? `<svg class="kpi-sparkline" viewBox="0 0 76 28" preserveAspectRatio="none">
         <path d="${sparkPath(spark)}" fill="none" stroke="var(--${tone === "danger" ? "danger" : tone === "warning" ? "warning" : "primary"})" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
       </svg>`
    : "";
  const deltaSvg =
    deltaDir === "up"
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 15l-6-6-6 6"/></svg>`
      : deltaDir === "down"
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>`
      : "";

  return `
    <div class="kpi-card">
      <div class="kpi-top">
        <div class="kpi-icon ${tone}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icon}</svg></div>
        <div class="kpi-tooltip-wrap">
          <div class="info-dot">i</div>
          <div class="tooltip-bubble">${tooltip}</div>
        </div>
      </div>
      <div class="kpi-label">${label}</div>
      <div class="kpi-value">${value}${unit ? `<span class="unit">${unit}</span>` : ""}</div>
      <div class="kpi-bottom">
        ${delta ? `<span class="kpi-delta ${deltaDir}">${deltaSvg}${delta}</span>` : "<span></span>"}
        ${sparkSvg}
      </div>
      ${compare ? `<div class="kpi-compare">${compare}</div>` : ""}
      ${explain ? `<div class="kpi-explain">${explain}</div>` : ""}
    </div>`;
}

export function renderKPIs() {
  const grid = document.getElementById("kpiGrid");
  const list = AppState.filtered;
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
      <p>No materials match the current filters.</p></div>`;
    return;
  }

  const prices = list.map((p) => p.currentAvgPrice ?? p.lastWeekPrice).filter((v) => v != null);
  const latest = list[0];
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const avgLastMonth = list.map((p) => p.lastMonthAvg).filter((v) => v != null).reduce((a, b, _, arr) => a + b / arr.length, 0);
  const highest = list.reduce((a, b) => ((b.currentAvgPrice ?? -1) > (a.currentAvgPrice ?? -1) ? b : a));
  const lowest = list.reduce((a, b) => {
    const av = a.currentAvgPrice ?? Infinity, bv = b.currentAvgPrice ?? Infinity;
    return bv < av ? b : a;
  });
  const wowVals = list.map((p) => p.wowPct).filter((v) => v != null);
  const avgWow = wowVals.reduce((a, b) => a + b, 0) / (wowVals.length || 1);
  const momVals = list.map((p) => p.momPct).filter((v) => v != null);
  const avgMom = momVals.reduce((a, b) => a + b, 0) / (momVals.length || 1);
  const volatility = Math.sqrt(wowVals.reduce((s, v) => s + (v - avgWow) ** 2, 0) / (wowVals.length || 1));

  const singleOrigin = list.filter((p) => !(p.cheapestCountry2 && p.cheapestCountry2 !== "-")).length;
  const dependencyPct = singleOrigin / list.length;

  const riskCounts = { HIGH_COST: 0, REVIEW: 0, MONITOR: 0, OPTIMAL: 0 };
  list.forEach((p) => (riskCounts[p.riskSignal] = (riskCounts[p.riskSignal] || 0) + 1));
  const riskLevel = riskCounts.HIGH_COST + riskCounts.REVIEW > list.length * 0.3 ? "Elevated" : riskCounts.HIGH_COST + riskCounts.REVIEW > 0 ? "Moderate" : "Low";
  const riskTone = riskLevel === "Elevated" ? "danger" : riskLevel === "Moderate" ? "warning" : "success";

  const actionCounts = {};
  list.forEach((p) => (actionCounts[p.procurementAction] = (actionCounts[p.procurementAction] || 0) + 1));
  const topAction = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0];

  grid.innerHTML = [
    card({
      icon: ICONS.price, tone: "accent", label: "Latest Price",
      value: fmtUSD(latest.lastWeekPrice ?? latest.currentAvgPrice), unit: "/MT",
      delta: fmtPct(latest.wowPct), deltaDir: dir(latest.wowPct),
      spark: [latest.avg2025, latest.sixMoAvg, latest.lastMonthAvg, latest.currentAvgPrice, latest.lastWeekPrice],
      tooltip: `Most recent recorded weekly price for ${latest.product}.`,
      compare: `vs. current avg: <strong>${fmtUSD(latest.currentAvgPrice)}</strong>/MT`,
      explain: `${latest.product} — the most recently priced material in this selection.`,
    }),
    card({
      icon: ICONS.trend, tone: "accent", label: "Average Price",
      value: fmtUSD(avgPrice), unit: "/MT",
      delta: fmtPct(avgWow), deltaDir: dir(avgWow),
      tooltip: "Portfolio-wide average of current prices across all filtered materials.",
      compare: `vs. last month avg: <strong>${fmtUSD(avgLastMonth)}</strong>/MT`,
      explain: "Blended average across every material currently in view.",
    }),
    card({
      icon: ICONS.high, tone: "danger", label: "Highest Price",
      value: fmtUSD(highest.currentAvgPrice), unit: "/MT",
      delta: highest.product, deltaDir: "flat",
      tooltip: "Material with the highest current average price in the filtered set.",
      compare: `WoW: <strong>${fmtPct(highest.wowPct)}</strong>`,
      explain: "The single most expensive line item to keep an eye on.",
    }),
    card({
      icon: ICONS.low, tone: "success", label: "Lowest Price",
      value: fmtUSD(lowest.currentAvgPrice), unit: "/MT",
      delta: lowest.product, deltaDir: "flat",
      tooltip: "Material with the lowest current average price in the filtered set.",
      compare: `WoW: <strong>${fmtPct(lowest.wowPct)}</strong>`,
      explain: "The most cost-efficient material currently tracked.",
    }),
    card({
      icon: ICONS.trend, tone: dir(avgMom) === "up" ? "danger" : "success", label: "Monthly Change %",
      value: fmtPct(avgMom),
      delta: dir(avgMom) === "up" ? "Rising vs. last month" : dir(avgMom) === "down" ? "Falling vs. last month" : "Flat vs. last month",
      deltaDir: dir(avgMom),
      tooltip: "Average month-on-month price change across filtered materials.",
      compare: `vs. prior period: <strong>${fmtPct(avgWow)}</strong> WoW`,
      explain: "Positive means the portfolio got more expensive over the last month.",
    }),
    card({
      icon: ICONS.volatility, tone: volatility > 15 ? "danger" : volatility > 8 ? "warning" : "success", label: "Price Volatility",
      value: volatility.toFixed(1), unit: "σ (WoW %)",
      delta: volatility > 15 ? "High dispersion" : volatility > 8 ? "Moderate" : "Stable", deltaDir: "flat",
      tooltip: "Standard deviation of week-on-week % price changes — higher means less predictable pricing.",
      compare: `Portfolio avg WoW: <strong>${fmtPct(avgWow)}</strong>`,
      explain: "Higher volatility means procurement timing matters more right now.",
    }),
    card({
      icon: ICONS.dependency, tone: dependencyPct > 0.5 ? "danger" : dependencyPct > 0.25 ? "warning" : "success", label: "Import Dependency %",
      value: (dependencyPct * 100).toFixed(0), unit: "%",
      delta: `${singleOrigin} of ${list.length} single-origin`, deltaDir: "flat",
      tooltip: "Share of materials with only one quoted country of origin on file — higher means greater supply concentration risk.",
      compare: `${list.length - singleOrigin} material(s) have a verified alternate origin`,
      explain: "Lower is safer — more materials have a backup sourcing country.",
    }),
    card({
      icon: ICONS.risk, tone: riskTone, label: "Risk Level",
      value: riskLevel,
      delta: `${riskCounts.HIGH_COST + riskCounts.REVIEW} flagged of ${list.length}`, deltaDir: "flat",
      tooltip: "Overall sourcing risk based on the share of HIGH COST / REVIEW signals in the current selection.",
      compare: `${riskCounts.OPTIMAL} optimal · ${riskCounts.MONITOR} monitor`,
      explain: "Combines cost-risk and review flags across the current selection.",
    }),
    card({
      icon: ICONS.reco, tone: "accent", label: "Top Recommendation",
      value: topAction ? topAction[0] : "—",
      delta: topAction ? `${topAction[1]} materials` : "", deltaDir: "flat",
      tooltip: "Most frequent procurement action recommended across the current selection.",
      compare: topAction ? `${Math.round((topAction[1] / list.length) * 100)}% of selection` : "",
      explain: "The action procurement is most often being pointed toward right now.",
    }),
  ].join("");
}

function dir(v) {
  if (v == null) return "flat";
  if (v > 0.002) return "up";
  if (v < -0.002) return "down";
  return "flat";
}
