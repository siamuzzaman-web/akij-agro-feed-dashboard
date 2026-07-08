// ==========================================================================
// modal.js — row detail modal shown when a table row is clicked
// ==========================================================================
import { AppState } from "./state.js";
import { fmtUSD, fmtPct, riskLabel } from "./utils.js";

export function openRowModal(productId) {
  const p = AppState.raw.products.products.find((x) => x.id === productId);
  if (!p) return;
  const overlay = document.getElementById("rowModal");
  const box = document.getElementById("rowModalBox");
  const risk = riskLabel(p.riskSignal);

  box.innerHTML = `
    <div class="modal-head">
      <div>
        <h3>${p.product}</h3>
        <span style="font-size:12px;color:var(--ink-500);">HS Code: ${p.hsCode} · Unit: ${p.unit}</span>
      </div>
      <button class="modal-close" id="modalCloseBtn">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="modal-grid">
      <div class="modal-stat"><div class="lbl">Last Week Price</div><div class="val">${fmtUSD(p.lastWeekPrice)}/MT</div></div>
      <div class="modal-stat"><div class="lbl">Current Avg Price</div><div class="val">${fmtUSD(p.currentAvgPrice)}/MT</div></div>
      <div class="modal-stat"><div class="lbl">6-Month Avg</div><div class="val">${fmtUSD(p.sixMoAvg)}/MT</div></div>
      <div class="modal-stat"><div class="lbl">2025 Avg</div><div class="val">${fmtUSD(p.avg2025)}/MT</div></div>
      <div class="modal-stat"><div class="lbl">WoW Change</div><div class="val">${fmtPct(p.wowPct)}</div></div>
      <div class="modal-stat"><div class="lbl">MoM Change</div><div class="val">${fmtPct(p.momPct)}</div></div>
      <div class="modal-stat"><div class="lbl">YoY Change</div><div class="val">${fmtPct(p.yoyPct)}</div></div>
      <div class="modal-stat"><div class="lbl">Next Week Forecast</div><div class="val">${fmtUSD(p.nextWkForecast)}/MT</div></div>
      <div class="modal-stat"><div class="lbl">Cheapest Origin #1</div><div class="val">${p.cheapestCountry1 || "—"} (${fmtUSD(p.price1)})</div></div>
      <div class="modal-stat"><div class="lbl">Cheapest Origin #2</div><div class="val">${p.cheapestCountry2 && p.cheapestCountry2 !== "-" ? p.cheapestCountry2 + " (" + fmtUSD(p.price2) + ")" : "—"}</div></div>
      <div class="modal-stat"><div class="lbl">Akij Sourcing Country</div><div class="val">${p.akijSourcingCountry || "—"}</div></div>
      <div class="modal-stat"><div class="lbl">Risk Signal</div><div class="val"><span class="cell-badge ${risk.tone}">${risk.label}</span></div></div>
    </div>
    <div style="margin-top:16px;padding:14px;border-radius:10px;background:var(--bg);border:1px solid var(--ink-200);">
      <div style="font-size:11px;font-weight:700;color:var(--ink-500);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">Procurement Action for Akij</div>
      <div style="font-size:14px;font-weight:700;color:var(--ink-900);">${p.procurementAction}</div>
    </div>
  `;

  overlay.classList.add("open");
  document.getElementById("modalCloseBtn").addEventListener("click", closeRowModal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeRowModal(); });
}

export function closeRowModal() {
  document.getElementById("rowModal").classList.remove("open");
}
