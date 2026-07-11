// ==========================================================================
// state.js — central data store + filter application
// ==========================================================================

export const AppState = {
  raw: null,          // all loaded JSON data
  filtered: [],        // filtered products array
  priceBounds: { min: 0, max: 3500 }, // computed once from data in initFilters()
  filters: {
    category: [],       // multi-select — empty array = "all"
    origin: [],          // multi-select
    risk: [],             // multi-select
    action: [],            // multi-select
    currency: "USD",
    year: "all",
    quarter: "all",
    month: "all",
    priceMin: 0,
    priceMax: 3500,
    dependency: "all",
    search: "",
  },
  theme: "light",
  sidebarCollapsed: false,
  tablePage: 1,
  tablePageSize: 8,
  tableSort: { key: "product", dir: "asc" },
  recTablePage: 1,
  dataReady: false,
};

const listeners = new Set();
export function onStateChange(fn) { listeners.add(fn); }
export function emitStateChange() { listeners.forEach((fn) => fn(AppState)); }

// Category buckets — simple heuristic classification of the 15 tracked materials
const CATEGORY_MAP = {
  "MAIZE/CORN": "Grains & Cereals",
  "SOYABEAN/SBM": "Oilseeds & Meals",
  "ANIMAL FEED": "Compound Feed",
  "WHEAT BRAN": "Grains & Cereals",
  "DDGS": "Grains & Cereals",
  "L-METHIONINE": "Amino Acids",
  "CALCIUM PHOSPHATE": "Minerals",
  "CORN GLUTEN FEED": "Grains & Cereals",
  "PH RAW MATERIALS": "Amino Acids",
  "L-LYSINE": "Amino Acids",
  "RAPESEED EXTRACTION (RSM)": "Oilseeds & Meals",
  "L-THREONINE": "Amino Acids",
  "AMINO ACID (FEED)": "Amino Acids",
  "FEED ADDITIVE": "Additives",
  "LIMESTONE POWDER": "Minerals",
};

export function categoryOf(productName) {
  return CATEGORY_MAP[productName] || "Other";
}

// Helper: true if a multi-select filter (array, empty = "all") permits value v
function permits(selection, v) {
  return !selection || selection.length === 0 || selection.includes(v);
}

export function applyFilters() {
  const { products } = AppState.raw.products;
  const f = AppState.filters;

  AppState.filtered = products.filter((p) => {
    if (!permits(f.category, categoryOf(p.product))) return false;
    if (!permits(f.origin, p.akijSourcingCountry)) return false;
    if (!permits(f.risk, p.riskSignal)) return false;
    if (!permits(f.action, p.procurementAction)) return false;
    if (f.dependency === "single" && p.cheapestCountry2 && p.cheapestCountry2 !== "-") return false;
    if (f.dependency === "multi" && !(p.cheapestCountry2 && p.cheapestCountry2 !== "-")) return false;

    const price = p.currentAvgPrice ?? p.lastWeekPrice ?? 0;
    if (price < f.priceMin || price > f.priceMax) return false;

    if (f.search) {
      const s = f.search.toLowerCase();
      const hay = `${p.product} ${p.hsCode} ${p.akijSourcingCountry} ${p.bestBuyCountry} ${p.source ?? ""}`.toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  });

  emitStateChange();
}

export function resetFilters() {
  AppState.filters = {
    category: [], origin: [], risk: [], action: [],
    currency: "USD", year: "all", quarter: "all", month: "all",
    priceMin: AppState.priceBounds.min, priceMax: AppState.priceBounds.max,
    dependency: "all", search: "",
  };
  applyFilters();
}

export function activeFilterCount() {
  const f = AppState.filters;
  let n = f.category.length + f.origin.length + f.risk.length + f.action.length;
  if (f.year !== "all") n++;
  if (f.quarter !== "all") n++;
  if (f.month !== "all") n++;
  if (f.dependency !== "all") n++;
  if (f.search) n++;
  if (f.priceMin > AppState.priceBounds.min || f.priceMax < AppState.priceBounds.max) n++;
  return n;
}
