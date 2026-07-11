// ==========================================================================
// exportUtils.js — Export PDF (print) and Export Excel (CSV) helpers
// ==========================================================================
import { AppState } from "./state.js";
import { downloadCSV, toast } from "./utils.js";

export function exportExcel() {
  const rows = [
    ["HS Code", "Material", "Unit", "Last Week Price", "Current Avg Price", "6-Mo Avg", "2025 Avg", "YTD %", "WoW %", "MoM %", "YoY %", "Akij Origin", "Best Buy Origin", "Risk Signal", "Recommendation", "Source"],
    ...AppState.filtered.map((p) => [
      p.hsCode, p.product, p.unit, p.lastWeekPrice, p.currentAvgPrice, p.sixMoAvg, p.avg2025,
      p.ytdPct, p.wowPct, p.momPct, p.yoyPct, p.akijSourcingCountry, p.bestBuyCountry, p.riskSignal, p.procurementAction, p.source || "-",
    ]),
  ];
  downloadCSV("akij_market_intelligence_export.csv", rows);
  toast("Excel (CSV) export downloaded");
}

export function exportPDF() {
  toast("Preparing print view for PDF export…");
  setTimeout(() => window.print(), 250);
}
