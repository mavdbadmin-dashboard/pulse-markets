# ⚡ PulseMarkets

> **The Market Doesn't Wait. Neither Should You.**

A full-featured market intelligence platform — built as a pure static PWA, deployable to GitHub Pages with zero backend.

## 🚀 Live Features

| Feature | Description |
|---|---|
| 📰 News Feed | Curated market news with category filters, featured articles, related tickers |
| 📊 Market Scanner | Top 25 gainers / losers / most active with real-time simulated price updates |
| 🏛️ Insider Trading | SEC Form 4-style filings table with filters (type, size, date range) |
| 🧠 Sentiment | Social sentiment bull/bear bars + trending tickers |
| 🏭 Sectors | Industry performance cards with hot sectors highlighted |
| ⭐ Watchlist | Persistent multi-stock watchlist (localStorage) |
| 🔔 Alerts | Price alert system with browser push notifications |
| 🎯 Paper Trading | $100K virtual portfolio with live P&L tracking |

## 🛠️ Stack

- **Pure HTML/CSS/JS** — no frameworks, no build step
- **TradingView widgets** — interactive charts on stock detail
- **localStorage** — watchlist, alerts, paper trading portfolio persistence
- **Service Worker** — offline capability, installable PWA
- **Simulated real-time data** — price updates every 2.5s, 50+ stocks

## 📂 Structure

```
stocks-news-app/
├── index.html              # Main app shell (all tabs)
├── css/styles.css          # Design system (~1000 lines, dark-first)
├── js/
│   ├── market-data.js      # Data layer, 50+ stocks, news, sectors, sentiment
│   ├── watchlist.js        # Watchlist manager
│   ├── alerts.js           # Price alert engine
│   ├── paper-trading.js    # Paper trading portfolio
│   ├── insider-trading.js  # Insider trade tracker
│   └── app.js              # Main app controller
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
└── img/                    # Icons
```

## 🌐 Deploy to GitHub Pages

### Option A — GitHub Pages (branch)
1. Push this folder to a GitHub repo
2. Go to **Settings → Pages → Source: Deploy from branch**
3. Select `main` branch, root `/` or `/docs`
4. Done — live at `https://yourusername.github.io/repo-name/`

### Option B — GitHub Actions (auto-deploy)
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - id: deployment
        uses: actions/deploy-pages@v4
```

### Local Dev
```bash
# Any static server works
npx serve .
# or
python3 -m http.server 8080
```

## 🎨 Branding

- **Name:** PulseMarkets
- **Tagline:** The Market Doesn't Wait. Neither Should You.
- **Logo:** ⚡ (lightning bolt)
- **Colors:** Navy `#0a0e1a` · Blue `#3b82f6` · Green `#10b981` · Red `#ef4444`

## ⚠️ Disclaimer

Data displayed is for informational and educational purposes only. Simulated prices are not real-time market data. 
Not investment advice.
