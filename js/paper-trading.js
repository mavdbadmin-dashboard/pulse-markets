// js/paper-trading.js — PulseMarkets Paper Trading Engine

class PaperTradingEngine {
  constructor(marketData) {
    this.marketData = marketData;
    this.storageKey = 'pm_paper';
    this.state = this._load();
    this._bindUpdates();
  }

  _load() {
    try {
      const stored = JSON.parse(localStorage.getItem(this.storageKey));
      if (stored && stored.cash !== undefined) return stored;
    } catch {}
    return this._fresh();
  }

  _fresh() {
    return {
      cash: 100000,
      startingCash: 100000,
      positions: {},
      trades: [],
      createdAt: Date.now(),
    };
  }

  _save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.state));
  }

  _bindUpdates() {
    this.marketData.subscribe('priceUpdate', () => {
      if (window.app && document.getElementById('pt-portfolio-value')) {
        app.renderPaperPortfolio();
      }
    });
  }

  reset() {
    this.state = this._fresh();
    this._save();
  }

  buy(symbol, shares) {
    symbol = symbol.toUpperCase();
    shares = parseInt(shares);
    if (!shares || shares < 1) return { error: 'Invalid share count' };
    const stock = this.marketData.getBySymbol(symbol);
    if (!stock) return { error: 'Symbol not found' };
    const cost = stock.price * shares;
    if (cost > this.state.cash) return { error: `Insufficient funds. Need $${cost.toFixed(2)}, have $${this.state.cash.toFixed(2)}` };

    this.state.cash = +(this.state.cash - cost).toFixed(2);
    if (!this.state.positions[symbol]) {
      this.state.positions[symbol] = { symbol, shares: 0, avgCost: 0, totalCost: 0 };
    }
    const pos = this.state.positions[symbol];
    pos.totalCost += cost;
    pos.shares += shares;
    pos.avgCost = pos.totalCost / pos.shares;

    this.state.trades.unshift({
      type: 'BUY', symbol, shares, price: stock.price,
      total: cost, timestamp: Date.now()
    });
    this._save();
    return { success: true, message: `Bought ${shares} shares of ${symbol} @ $${stock.price.toFixed(2)}` };
  }

  sell(symbol, shares) {
    symbol = symbol.toUpperCase();
    shares = parseInt(shares);
    const pos = this.state.positions[symbol];
    if (!pos || pos.shares < shares) return { error: 'Insufficient shares' };
    const stock = this.marketData.getBySymbol(symbol);
    if (!stock) return { error: 'Symbol not found' };

    const proceeds = stock.price * shares;
    this.state.cash = +(this.state.cash + proceeds).toFixed(2);
    pos.shares -= shares;
    if (pos.shares === 0) {
      delete this.state.positions[symbol];
    } else {
      pos.totalCost = pos.avgCost * pos.shares;
    }

    this.state.trades.unshift({
      type: 'SELL', symbol, shares, price: stock.price,
      total: proceeds, timestamp: Date.now()
    });
    this._save();
    return { success: true, message: `Sold ${shares} shares of ${symbol} @ $${stock.price.toFixed(2)}` };
  }

  getPortfolioValue() {
    let marketValue = 0;
    Object.values(this.state.positions).forEach(pos => {
      const stock = this.marketData.getBySymbol(pos.symbol);
      if (stock) marketValue += stock.price * pos.shares;
    });
    return { marketValue, cash: this.state.cash, total: marketValue + this.state.cash };
  }

  getPositionsWithPL() {
    return Object.values(this.state.positions).map(pos => {
      const stock = this.marketData.getBySymbol(pos.symbol) || {};
      const currentVal = (stock.price || 0) * pos.shares;
      const costBasis = pos.avgCost * pos.shares;
      const pl = currentVal - costBasis;
      const plPct = costBasis ? (pl / costBasis) * 100 : 0;
      return { ...pos, currentPrice: stock.price || 0, currentVal, costBasis, pl, plPct };
    });
  }

  getTotalPL() {
    const { total } = this.getPortfolioValue();
    return total - this.state.startingCash;
  }

  render(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const { cash, total } = this.getPortfolioValue();
    const totalPL = this.getTotalPL();
    const positions = this.getPositionsWithPL();
    const plPos = totalPL >= 0;

    el.innerHTML = `
      <div class="pt-header">
        <div class="pt-stat">
          <span class="pt-label">Portfolio Value</span>
          <span class="pt-value" id="pt-portfolio-value">$${this._fmt(total)}</span>
        </div>
        <div class="pt-stat">
          <span class="pt-label">Cash Available</span>
          <span class="pt-value">$${this._fmt(cash)}</span>
        </div>
        <div class="pt-stat">
          <span class="pt-label">Total P&L</span>
          <span class="pt-value ${plPos ? 'pos' : 'neg'}">${plPos ? '+' : ''}$${this._fmt(totalPL)} (${plPos ? '+' : ''}${((totalPL / this.state.startingCash) * 100).toFixed(2)}%)</span>
        </div>
        <button class="btn btn-sm btn-danger" onclick="if(confirm('Reset paper trading account?')) { app.paperTrading.reset(); app.renderPaperPortfolio(); }">Reset Account</button>
      </div>

      <h4 class="pt-section-title">Open Positions</h4>
      ${positions.length === 0
        ? '<div class="pt-empty">No open positions. Use the trade form to buy stocks.</div>'
        : `<div class="pt-positions">
          <div class="pt-positions-header">
            <span>Symbol</span><span>Shares</span><span>Avg Cost</span><span>Current</span><span>Value</span><span>P&L</span><span></span>
          </div>
          ${positions.map(p => `
            <div class="pt-position-row">
              <span class="pos-symbol">${p.symbol}</span>
              <span>${p.shares}</span>
              <span>$${p.avgCost.toFixed(2)}</span>
              <span>$${p.currentPrice.toFixed(2)}</span>
              <span>$${this._fmt(p.currentVal)}</span>
              <span class="${p.pl >= 0 ? 'pos' : 'neg'}">${p.pl >= 0 ? '+' : ''}$${this._fmt(p.pl)} (${p.plPct.toFixed(2)}%)</span>
              <span>
                <button class="btn btn-sm" onclick="app.showQuickSell('${p.symbol}', ${p.shares})">Sell</button>
              </span>
            </div>
          `).join('')}
        </div>`
      }

      <h4 class="pt-section-title">Recent Trades</h4>
      <div class="pt-trades">
        ${this.state.trades.slice(0, 10).map(t => `
          <div class="pt-trade-row ${t.type.toLowerCase()}">
            <span class="trade-type ${t.type === 'BUY' ? 'pos' : 'neg'}">${t.type}</span>
            <span class="trade-sym">${t.symbol}</span>
            <span>${t.shares} shares @ $${t.price.toFixed(2)}</span>
            <span class="trade-total">$${this._fmt(t.total)}</span>
            <span class="trade-time">${this._relTime(t.timestamp)}</span>
          </div>
        `).join('') || '<div class="pt-empty">No trades yet.</div>'}
      </div>
    `;
  }

  _fmt(n) {
    return Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  _relTime(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString();
  }
}
