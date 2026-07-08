// ==========================================================================
// script.js — application entry point
// ==========================================================================
import { AppState, applyFilters } from "./state.js";
import { loadAllData, showLoadError } from "./dataLoader.js";
import { initFilters, renderChips } from "./filters.js";
import { renderKPIs } from "./kpi.js";
import {
  renderPriceTrend, renderRiskDonut, renderWowBar, renderSourcingGap,
  renderVolatility, renderForecast, renderPriceBar,
  renderCountryRank, renderCountryAvgPrice, renderSupplierComparison,
  renderImportTrend, renderRiskMatrix, renderHeatmap, renderTreemap,
} from "./charts.js";
import { renderMainTable, renderTableToolbar } from "./table.js";
import { renderSignalCards, renderDependencyGrid, renderSupplierTable, renderRecommendationsTable } from "./signals.js";
import { renderAICards, renderExecutiveSummary, renderExecutiveBrief, renderHealthScore, renderWatchlistPanel } from "./insights.js";
import { openRowModal, closeRowModal } from "./modal.js";
import { exportExcel, exportPDF } from "./exportUtils.js";
import { initTheme, initSidebar, initNav } from "./theme.js";
import { debounce, toast } from "./utils.js";

let currentView = "dashboard";

async function bootstrap() {
  try {
    const data = await loadAllData();
    AppState.raw = data;
  } catch (err) {
    console.error(err);
    hideLoadingScreen();
    showLoadError(document.getElementById("pageContent"));
    return;
  }

  document.getElementById("lastUpdated").textContent = `Last updated ${formatDate(AppState.raw.products.asOfDate)}`;
  document.getElementById("footerDate").textContent = formatDate(AppState.raw.products.asOfDate);
  document.getElementById("settingsAsOf").textContent = formatDate(AppState.raw.products.asOfDate);
  document.getElementById("settingsAnalyst").textContent = AppState.raw.products.analyst;

  applyFilters();
  initFilters(() => renderCurrentView());
  initTheme();
  initSidebar();
  initNav((view) => {
    currentView = view;
    renderCurrentView();
  });

  document.getElementById("globalSearch").addEventListener("input", debounce((e) => {
    AppState.filters.search = e.target.value;
    applyFilters();
    renderChips();
    renderCurrentView();
  }, 200));

  document.getElementById("exportExcelBtn").addEventListener("click", exportExcel);
  document.getElementById("exportPdfBtn").addEventListener("click", exportPDF);

  const toolbarHost = document.getElementById("mainTableToolbar");
  renderTableToolbar(toolbarHost);
  document.getElementById("tableSearch").addEventListener("input", debounce((e) => {
    AppState.filters.search = e.target.value;
    document.getElementById("globalSearch").value = e.target.value;
    applyFilters();
    renderChips();
    renderCurrentView();
  }, 200));
  document.getElementById("tableExportBtn").addEventListener("click", exportExcel);

  document.querySelectorAll("#trendTabs .tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#trendTabs .tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderPriceTrend("priceTrendChart", Number(btn.dataset.range));
    });
  });

  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeRowModal(); });
  document.addEventListener("theme:changed", () => renderCurrentView());

  renderCurrentView();
  AppState.dataReady = true;
  hideLoadingScreen();
  toast("Dashboard data loaded");
}

function hideLoadingScreen() {
  const el = document.getElementById("loadingScreen");
  if (!el) return;
  el.classList.add("hide");
  setTimeout(() => el.remove(), 500);
}

function renderCurrentView() {
  if (!AppState.raw) return;
  renderKPIs();

  switch (currentView) {
    case "dashboard":
      renderExecutiveBrief("execBriefGrid");
      renderHealthScore("healthScoreBlock");
      renderExecutiveSummary("execSummaryGrid");
      renderPriceTrend("priceTrendChart", 12);
      renderRiskDonut("riskDonutChart");
      renderWowBar("wowBarChart");
      renderSourcingGap("sourcingGapChart");
      renderAICards("aiCardsDashboard");
      renderWatchlistPanel("watchlistPanel");
      renderSignalCards("signalGridDashboard", 6);
      break;
    case "price":
      renderPriceTrend("priceAnalysisLineChart", 12);
      renderVolatility("volatilityChart");
      renderHeatmap("heatmapTable");
      renderForecast("forecastChart");
      renderPriceBar("priceBarChart");
      break;
    case "country":
      renderCountryRank("countryRankChart");
      renderCountryAvgPrice("countryAvgPriceChart");
      renderTreemap("countryTreemap");
      break;
    case "supplier":
      renderSourcingGap("supplierComparisonChart");
      renderSupplierTable("supplierTable");
      break;
    case "dependency":
      renderImportTrend("importTrendChart");
      renderRiskMatrix("riskMatrixChart");
      renderDependencyGrid("dependencyGrid");
      break;
    case "signals":
      renderSignalCards("signalGridFull");
      break;
    case "recommendations":
      renderRecommendationsTable("recommendationsTable");
      break;
    case "ai":
      renderAICards("aiCardsFull");
      break;
    default:
      break;
  }

  // Main detailed analysis table lives conceptually under Price Analysis / Dashboard.
  // We attach it to the dashboard view's data flow but render once on data change.
  renderDetailTableIfPresent();
}

function renderDetailTableIfPresent() {
  const table = document.getElementById("mainDetailTable");
  if (table) renderMainTable("mainDetailTable", openRowModal);
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

bootstrap();
