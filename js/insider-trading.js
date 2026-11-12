// js/insider-trading.js — PulseMarkets Insider Trade Tracker

class InsiderTracker {
  constructor(marketData) {
    this.marketData = marketData;
    this.filings = this._buildFilings();
    this.filters = { type: 'all', minSize: 0, dateRange: 90 };
  }

  _buildFilings() {
    const names = [
      'Jensen Huang', 'Elon Musk', 'Tim Cook', 'Satya Nadella', 'Mark Zuckerberg',
      'Lisa Su', 'Andy Jassy', 'Ruth Porat', 'David Fintzen', 'Brian Moynihan',
      'Jamie Dimon', 'Mary Barra', 'Bob Chapek', 'Doug McMillon', 'Bob Iger',
      'Nancy Pelosi', 'Dan Crenshaw', 'Nancy-Ann DeParle', 'William Hurd', 'John Kerry',
      'George Kurtz', 'Nikesh Arora', 'Matthew Prince', 'Olivier Pomel', 'Jay Chaudhry',
      'Alex Karp', 'Peter Thiel', 'Marc Andreessen', 'David Sacks', 'Keith Gill',
    ];
    const titles = ['CEO', 'CFO', 'COO', 'Director', 'VP Sales', 'CTO', 'President', 'CRO', 'EVP', 'SVP'];
    const tickers = ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'AMD', 'META', 'COIN', 'PLTR', 'CRWD', 'SOFI', 'HOOD', 'AMZN', 'GOOGL', 'GME', 'IONQ', 'MARA', 'NET', 'DDOG'];

    const filings = [];
    for (let i = 0; i < 80; i++) {
      const symbol = tickers[Math.floor(Math.random() * tickers.length)];
      const stock = this.marketData.getBySymbol(symbol);
      const isBuy = Math.random() > 0.4;
      const shares = Math.floor(Math.random() * 500000) + 1000;
      const price = stock ? +(stock.price * (0.95 + Math.random() * 0.1)).toFixed(2) : 50;
      const value = shares * price;
      const daysAgo = Math.floor(Math.random() * 90);
      const date = new Date(Date.now() - daysAgo * 86400000);

      filings.push({
        id: i,
        name: names[Math.floor(Math.random() * names.length)],
        title: titles[Math.floor(Math.random() * titles.length)],
        symbol,
        company: stock ? stock.name : symbol,
        type: isBuy ? 'BUY' : 'SELL',
        shares,
        price,
        value,
        date: date.toISOString().split('T')[0],
        dateTs: date.getTime(),
        formType: ['4', '4/A'][Math.floor(Math.random() * 2)],
        ownership: ['Direct', 'Indirect'][Math.floor(Math.random() * 2)],
      });
    }

    return filings.sort((a, b) => b.dateTs - a.dateTs);
  }

  getFiltered(overrides = {}) {
    const f = { ...this.filters, ...overrides };
    const cutoff = Date.now() - f.dateRange * 86400000;

    return this.filings.filter(filing => {
      if (f.type !== 'all' && filing.type !== f.type.toUpperCase()) return false;
      if (filing.value < f.minSize) return false;
      if (filing.dateTs < cutoff) return false;
      return true;
    });
  }

  getSummaryStats() {
    const buys = this.filings.filter(f => f.type === 'BUY');
    const sells = this.filings.filter(f => f.type === 'SELL');
    return {
      totalFilings: this.filings.length,
      totalBuys: buys.length,
      totalSells: sells.length,
      buyValue: buys.reduce((s, f) => s + f.value, 0),
      sellValue: sells.reduce((s, f) => s + f.value, 0),
      bullishSignal: buys.length > sells.length,
    };
  }

  render(containerId, maxRows = 50) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const filings = this.getFiltered().slice(0, maxRows);
    const stats = this.getSummaryStats();

    el.innerHTML = `
      <div class="insider-stats">
        <div class="is-stat">
          <span class="is-label">Total Filings (90d)</span>
          <span class="is-value">${stats.totalFilings}</span>
        </div>
        <div class="is-stat pos">
          <span class="is-label">Buy Volume</span>
          <span class="is-value pos">$${this._fmtM(stats.buyValue)}</span>
        </div>
        <div class="is-stat neg">
          <span class="is-label">Sell Volume</span>
          <span class="is-value neg">$${this._fmtM(stats.sellValue)}</span>
        </div>
        <div class="is-stat">
          <span class="is-label">Insider Signal</span>
          <span class="is-value ${stats.bullishSignal ? 'pos' : 'neg'}">${stats.bullishSignal ? '🟢 Bullish' : '🔴 Bearish'}</span>
        </div>
      </div>

      <div class="insider-filters">
        <button class="filter-btn active" data-filter="all" onclick="app.insiderTracker.setFilter('type','all'); app.renderInsider();">All</button>
        <button class="filter-btn" data-filter="buy" onclick="app.insiderTracker.setFilter('type','buy'); app.renderInsider();">Buys Only</button>
        <button class="filter-btn" data-filter="sell" onclick="app.insiderTracker.setFilter('type','sell'); app.renderInsider();">Sells Only</button>
        <select class="filter-select" onchange="app.insiderTracker.setFilter('minSize', parseInt(this.value)); app.renderInsider();">
          <option value="0">Any Size</option>
          <option value="100000">$100K+</option>
          <option value="500000">$500K+</option>
          <option value="1000000">$1M+</option>
          <option value="5000000">$5M+</option>
        </select>
        <select class="filter-select" onchange="app.insiderTracker.setFilter('dateRange', parseInt(this.value)); app.renderInsider();">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90" selected>Last 90 days</option>
        </select>
      </div>

      <div class="insider-table-wrap">
        <table class="insider-table">
          <thead>
            <tr>
              <th>Date</th><th>Insider</th><th>Title</th><th>Company</th>
              <th>Type</th><th>Shares</th><th>Price</th><th>Value</th><th>Form</th>
            </tr>
          </thead>
          <tbody>
            ${filings.map(f => `
              <tr class="insider-row ${f.type.toLowerCase()}">
                <td>${f.date}</td>
                <td>${f.name}</td>
                <td class="it-title">${f.title}</td>
                <td><strong>${f.symbol}</strong></td>
                <td><span class="type-badge ${f.type === 'BUY' ? 'buy' : 'sell'}">${f.type}</span></td>
                <td>${f.shares.toLocaleString()}</td>
                <td>$${f.price.toFixed(2)}</td>
                <td class="${f.type === 'BUY' ? 'pos' : 'neg'}">$${this._fmtM(f.value)}</td>
                <td><span class="form-badge">Form ${f.formType}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  setFilter(key, value) {
    this.filters[key] = value;
    // Update active filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === value);
    });
  }

  _fmtM(n) {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toFixed(2);
  }
}
