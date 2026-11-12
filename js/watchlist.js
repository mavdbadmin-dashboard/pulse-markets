// js/watchlist.js — PulseMarkets Watchlist Manager

class WatchlistManager {
  constructor(marketData) {
    this.marketData = marketData;
    this.storageKey = 'pm_watchlist';
    this.watchlist = this._load();
    this._ensureDefaults();
  }

  _load() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    } catch { return []; }
  }

  _save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.watchlist));
  }

  _ensureDefaults() {
    if (this.watchlist.length === 0) {
      ['NVDA', 'AAPL', 'TSLA', 'COIN', 'AMD'].forEach(s => this.add(s));
    }
  }

  add(symbol) {
    symbol = symbol.toUpperCase();
    if (!this.watchlist.includes(symbol)) {
      this.watchlist.push(symbol);
      this._save();
      return true;
    }
    return false;
  }

  remove(symbol) {
    symbol = symbol.toUpperCase();
    const idx = this.watchlist.indexOf(symbol);
    if (idx !== -1) {
      this.watchlist.splice(idx, 1);
      this._save();
      return true;
    }
    return false;
  }

  toggle(symbol) {
    return this.has(symbol) ? (this.remove(symbol), false) : (this.add(symbol), true);
  }

  has(symbol) {
    return this.watchlist.includes(symbol.toUpperCase());
  }

  getStocks() {
    return this.watchlist.map(sym => this.marketData.getBySymbol(sym)).filter(Boolean);
  }

  renderCard(stock) {
    const pos = stock.changePercent >= 0;
    return `
      <div class="watchlist-card" data-symbol="${stock.symbol}">
        <div class="wl-left">
          <span class="wl-symbol">${stock.symbol}</span>
          <span class="wl-name">${stock.name.split(' ').slice(0, 2).join(' ')}</span>
        </div>
        <div class="wl-right">
          <span class="wl-price">$${stock.price.toFixed(2)}</span>
          <span class="wl-change ${pos ? 'pos' : 'neg'}">${pos ? '+' : ''}${stock.changePercent.toFixed(2)}%</span>
        </div>
        <button class="wl-remove" onclick="app.watchlist.toggle('${stock.symbol}'); app.renderWatchlist();" title="Remove">×</button>
      </div>
    `;
  }

  render(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const stocks = this.getStocks();
    if (stocks.length === 0) {
      el.innerHTML = '<div class="wl-empty">Add tickers to your watchlist to track them here.</div>';
      return;
    }
    el.innerHTML = stocks.map(s => this.renderCard(s)).join('');
  }
}
