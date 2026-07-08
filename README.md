# Akij Agro Feed — Market Intelligence Dashboard

Executive-grade market intelligence dashboard for Bangladesh Agro Feed raw
material pricing and sourcing intelligence. Built with plain HTML5, CSS3,
vanilla ES6 modules, and Chart.js — no frameworks, no build step.

## Running locally

Modern browsers block `fetch()` of local JSON files when a page is opened
directly from disk (`file://…`). Because all dashboard data is loaded from
the `/data` folder (by design, so the dashboard can be updated without
touching any code), you need to serve the folder over HTTP:

```bash
cd akij-dashboard
python3 -m http.server 8080
# then open http://localhost:8080 in your browser
```

Any static file server works (`npx serve`, VS Code "Live Server", etc.).
Once deployed to **GitHub Pages** (or any static host), it works instantly
with no extra steps — just push this folder to a `gh-pages` branch or
enable Pages on `main`.

## Folder structure

```
akij-dashboard/
├── index.html              # App shell: sidebar, top bar, all views
├── css/
│   └── style.css           # Full design system (tokens, components, responsive)
├── js/
│   ├── script.js           # Entry point — boots the app, wires views together
│   ├── state.js            # Central store + filter logic
│   ├── dataLoader.js       # Fetches all /data/*.json files
│   ├── filters.js          # Filter panel (Power-BI style slicers)
│   ├── kpi.js              # Executive KPI cards
│   ├── charts.js           # All Chart.js chart renderers
│   ├── table.js            # Detailed analysis table (sort/search/paginate)
│   ├── signals.js          # Market signal cards, dependency cards, sub-tables
│   ├── insights.js         # AI Insights cards + Executive Summary panel
│   ├── modal.js            # Row detail modal
│   ├── exportUtils.js      # CSV ("Export Excel") + print ("Export PDF")
│   ├── theme.js            # Dark mode, sidebar collapse, view navigation
│   └── utils.js            # Formatters and small shared helpers
└── data/
    ├── products.json         # Core 15-material price & sourcing dataset
    ├── history.json          # 12-month price trend series per material
    ├── countries.json        # Aggregated sourcing-country intelligence
    ├── suppliers.json         # Akij sourcing vs. best-buy cost comparison
    ├── signals.json           # Go / Monitor / Risk signal cards
    ├── recommendations.json   # Procurement action per material
    └── ai_insights.json       # AI Executive Insights copy blocks
```

## Updating data

Every number on the dashboard is read from the JSON files above — nothing
is hardcoded in HTML or JS. To refresh the dashboard for a new week/month,
regenerate these files from the source Feed Raw Material Price Tracker and
redeploy; no code changes are required.

## Data source & caveats

Sourced from the internal **Feed Raw Material Price Tracker & Sourcing
Intelligence Dashboard** (as of the date shown in the top bar). The
`history.json` monthly series is interpolated between the tracker's known
anchor points (2025 average, 6-month average, last-month average, current
average, last-week price) purely for chart visualization — treat it as
indicative trend shape, not verified weekly data.
