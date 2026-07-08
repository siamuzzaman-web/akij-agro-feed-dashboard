// ==========================================================================
// utils.js — shared formatting & helper functions
// ==========================================================================

export const fmtUSD = (v, decimals = 0) => {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

export const fmtPct = (v, decimals = 1) => {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${(v * 100).toFixed(decimals)}%`;
};

export const fmtNum = (v, decimals = 0) => {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return Number(v).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

export const titleCase = (str) =>
  str.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase());

export const debounce = (fn, wait = 220) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
};

// Color scale for heatmap cells based on % change value.
export function heatColor(pct) {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return "#94A3B8";
  const clamped = Math.max(-0.5, Math.min(0.5, pct));
  if (clamped >= 0) {
    const t = clamped / 0.5;
    return mixColor("#FEF6E7", "#DC2626", t);
  } else {
    const t = Math.abs(clamped) / 0.5;
    return mixColor("#EAF7EF", "#16A34A", t);
  }
}

function mixColor(hexA, hexB, t) {
  const a = hexToRgb(hexA), b = hexToRgb(hexB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r},${g},${bl})`;
}

function hexToRgb(hex) {
  const v = hex.replace("#", "");
  return {
    r: parseInt(v.substring(0, 2), 16),
    g: parseInt(v.substring(2, 4), 16),
    b: parseInt(v.substring(4, 6), 16),
  };
}

export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function toast(message) {
  const stack = document.getElementById("toastStack");
  if (!stack) return;
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg><span>${message}</span>`;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

export function riskLabel(signal) {
  switch (signal) {
    case "OPTIMAL": return { label: "Optimal", tone: "success" };
    case "MONITOR": return { label: "Monitor", tone: "warning" };
    case "HIGH_COST": return { label: "High Cost", tone: "danger" };
    case "REVIEW": return { label: "Review", tone: "danger" };
    default: return { label: signal || "—", tone: "neutral" };
  }
}

export function downloadCSV(filename, rows) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
