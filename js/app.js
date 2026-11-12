// js/app.js — PulseMarkets Main Application

'use strict';

// ═══════════════════════════════════════════════════════════════
// GLOBAL APP
// ═══════════════════════════════════════════════════════════════
class PulseMarketsApp {
  constructor() {
    this.data        = new MarketData();
    this.watchlist   = new WatchlistManager(this.data);
    this.alertMgr    = new AlertManager(this.data);
    this.paperTrading= new PaperTradingEngine(this.data);
    this.insiderTracker = new InsiderTracker(this.data);

    this.activeTab   = 'news';
    this.scannerView = 'gainers';
    this.newsFilter  = 'all';
    this.stockDetail = null;

    this.init();
  }

  init() {
    this._renderTickerTape();
    this._renderIndices();
    this._setActiveTab('news');
    this.renderNews();
    this.renderWatchlist();
    this.data.startRealTimeUpdates();

    // Live refresh hooks
    this.data.subscribe('priceUpdate', () => {
      this._refreshTickerTape();
      this._refreshIndices();
      if (this.activeTab === 'scanner') this.renderScanner();
      if (this.activeTab === 'watchlist') this.renderWatchlist();
      if (this.activeTab === 'paper') this.renderPaperPortfolio();
      if (this.stockDetail) this._refreshStockDetail();
    });

    // Search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', e => this._handleSearch(e.target.value));
      searchInput.addEventListener('keydown', e => {
        if (e.key === 'Escape') this._closeSearch();
      });
    }

    // Alert form
    this._bindAlertForm();
    this._bindTradeForm();

    // Request notification permission
    if (Notification && Notification.permission === 'default') {
      setTimeout(() => Notification.requestPermission(), 5000);
    }
  }

  // ─── Navigation ─────────────────────────────────────────────
  _setActiveTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });
    document.querySelectorAll('.tab-pane').forEach(el => {
      el.classList.toggle('active', el.id === `tab-${tab}`);
    });
  }

  navigate(tab) {
    this._setActiveTab(tab);
    const renders = {
      news:     () => this.renderNews(),
      scanner:  () => this.renderScanner(),
      insider:  () => this.renderInsider(),
      sentiment:() => this.renderSentiment(),
      sectors:  () => this.renderSectors(),
      watchlist:() => this.renderWatchlist(),
      alerts:   () => this.renderAlerts(),
      paper:    () => this.renderPaperPortfolio(),
    };
    if (renders[tab]) renders[tab]();
  }

  // ─── Ticker Tape ────────────────────────────────────────────
  _renderTickerTape() {
    const el = document.getElementById('ticker-tape-inner');
    if (!el) return;
    const items = [...this.data.indices, ...this.data.getTopGainers(20)];
    el.innerHTML = items.map(s => {
      const pos = s.changePercent >= 0;
      const val = s.value !== undefined ? s.value.toLocaleString('en-US', {maximumFractionDigits: 2}) : `$${s.price.toFixed(2)}`;
      return `<span class="ticker-item"><span class="ticker-sym">${s.symbol}</span><span class="ticker-price">${val}</span><span class="ticker-chg ${pos ? 'pos' : 'neg'}">${pos ? '+' : ''}${s.changePercent.toFixed(2)}%</span></span>`;
    }).join('');
    // duplicate for seamless loop
    el.innerHTML += el.innerHTML;
  }

  _refreshTickerTape() {
    const items = document.querySelectorAll('.ticker-item');
    const allItems = [...this.data.indices, ...this.data.getTopGainers(20)];
    const totalPerSet = allItems.length;

    items.forEach((item, i) => {
      const src = allItems[i % totalPerSet];
      if (!src) return;
      const pos = src.changePercent >= 0;
      const price = item.querySelector('.ticker-price');
      const chg   = item.querySelector('.ticker-chg');
      if (price) price.textContent = src.value !== undefined
        ? src.value.toLocaleString('en-US', { maximumFractionDigits: 2 })
        : `$${src.price.toFixed(2)}`;
      if (chg) {
        chg.textContent = `${pos ? '+' : ''}${src.changePercent.toFixed(2)}%`;
        chg.className = `ticker-chg ${pos ? 'pos' : 'neg'}`;
      }
    });
  }

  // ─── Market Indices Bar ──────────────────────────────────────
  _renderIndices() {
    const el = document.getElementById('market-indices');
    if (!el) return;
    el.innerHTML = this.data.indices.map(idx => {
      const pos = idx.changePercent >= 0;
      return `
        <div class="index-card">
          <span class="index-name">${idx.name}</span>
          <span class="index-value">${idx.value.toLocaleString('en-US', {maximumFractionDigits: 2})}</span>
          <span class="index-chg ${pos ? 'pos' : 'neg'}">${pos ? '+' : ''}${idx.changePercent.toFixed(2)}%</span>
        </div>`;
    }).join('');
  }

  _refreshIndices() {
    document.querySelectorAll('.index-card').forEach((card, i) => {
      const idx = this.data.indices[i];
      if (!idx) return;
      const pos = idx.changePercent >= 0;
      const val = card.querySelector('.index-value');
      const chg = card.querySelector('.index-chg');
      if (val) val.textContent = idx.value.toLocaleString('en-US', { maximumFractionDigits: 2 });
      if (chg) { chg.textContent = `${pos ? '+' : ''}${idx.changePercent.toFixed(2)}%`; chg.className = `index-chg ${pos ? 'pos' : 'neg'}`; }
    });
  }

  // ─── News Feed ───────────────────────────────────────────────
  renderNews() {
    const el = document.getElementById('news-grid');
    if (!el) return;
    const articles = this.data.getNewsByCategory(this.newsFilter);
    el.innerHTML = articles.map((a, i) => this._newsCard(a, i === 0)).join('');
  }

  _newsCard(a, featured = false) {
    const timeStr = this._relTime(a.timestamp);
    const hot = a.hot ? '<span class="hot-badge">🔥 HOT</span>' : '';
    return `
      <article class="news-card ${featured ? 'news-card-featured' : ''}" onclick="app.openNews(${a.id})">
        <div class="news-thumbnail" style="background: ${a.gradient}">
          <span class="news-emoji">${a.emoji}</span>
          ${hot}
        </div>
        <div class="news-body">
          <div class="news-meta">
            <span class="news-source">${a.source}</span>
            <span class="news-time">${timeStr}</span>
            <span class="news-read-time">${a.readTime}</span>
          </div>
          <h3 class="news-headline">${a.headline}</h3>
          <p class="news-snippet">${a.snippet}</p>
          <div class="news-tickers">
            ${(a.tickers || []).map(t => `<span class="ticker-tag" onclick="event.stopPropagation(); app.openStockDetail('${t}')">${t}</span>`).join('')}
          </div>
        </div>
      </article>`;
  }

  filterNews(cat) {
    this.newsFilter = cat;
    document.querySelectorAll('.news-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cat === cat);
    });
    this.renderNews();
  }

  openNews(id) {
    const article = this.data.news.find(n => n.id === id);
    if (!article) return;
    this._showModal(`
      <div class="modal-news">
        <div class="modal-news-thumb" style="background: ${article.gradient}">
          <span style="font-size: 4rem">${article.emoji}</span>
        </div>
        <div class="modal-news-meta">
          <span class="news-source">${article.source}</span> · <span>${article.author}</span> · <span>${this._relTime(article.timestamp)}</span>
        </div>
        <h2>${article.headline}</h2>
        <p style="color: var(--text-secondary); line-height: 1.8; margin-bottom: 1.5rem">${article.snippet}</p>
        <p style="color: var(--text-secondary); line-height: 1.8">
          Markets continue to react to shifting economic conditions as investors weigh the implications of recent developments across sectors. 
          Analyst consensus suggests a cautious but optimistic outlook heading into the next earnings cycle. 
          Risk management remains a priority as volatility indicators show mixed signals across asset classes.
          Institutional positioning data reveals increased interest in growth sectors while value plays continue to attract defensive capital.
        </p>
        <div class="news-tickers" style="margin-top:1.5rem">
          <strong>Related:</strong>
          ${(article.tickers || []).map(t => `<span class="ticker-tag" onclick="app._closeModal(); app.openStockDetail('${t}')">${t}</span>`).join('')}
        </div>
      </div>
    `, article.headline);
  }

  // ─── Stock Scanner ───────────────────────────────────────────
  renderScanner() {
    const el = document.getElementById('scanner-table');
    if (!el) return;

    let stocks;
    if (this.scannerView === 'gainers') stocks = this.data.getTopGainers(25);
    else if (this.scannerView === 'losers') stocks = this.data.getTopLosers(25);
    else stocks = this.data.getMostActive(25);

    el.innerHTML = `
      <div class="scanner-header-row">
        <span>#</span><span>Symbol</span><span>Company</span><span>Price</span>
        <span>Change</span><span>Change %</span><span>Volume</span><span>Mkt Cap</span><span>52wk</span>
      </div>
      ${stocks.map((s, i) => {
        const pos = s.changePercent >= 0;
        return `
          <div class="scanner-row" onclick="app.openStockDetail('${s.symbol}')">
            <span class="scanner-rank">${i + 1}</span>
            <span class="scanner-symbol">${s.symbol}</span>
            <span class="scanner-name">${s.name.substring(0, 22)}${s.name.length > 22 ? '…' : ''}</span>
            <span class="scanner-price">$${s.price.toFixed(2)}</span>
            <span class="scanner-change ${pos ? 'pos' : 'neg'}">${pos ? '+' : ''}$${Math.abs(s.change).toFixed(2)}</span>
            <span class="scanner-pct ${pos ? 'pos' : 'neg'}">
              <span class="pct-pill ${pos ? 'pos' : 'neg'}">${pos ? '▲' : '▼'} ${Math.abs(s.changePercent).toFixed(2)}%</span>
            </span>
            <span class="scanner-vol">${this._fmtVol(s.volume)}</span>
            <span class="scanner-mkt">${this._fmtCap(s.marketCap)}</span>
            <span class="scanner-52">
              <span class="pos">▲${s.week52High.toFixed(0)}</span> / <span class="neg">▼${s.week52Low.toFixed(0)}</span>
            </span>
          </div>`;
      }).join('')}
    `;
  }

  setScannerView(view) {
    this.scannerView = view;
    document.querySelectorAll('.scanner-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    this.renderScanner();
  }

  // ─── Stock Detail ────────────────────────────────────────────
  openStockDetail(symbol) {
    const stock = this.data.getBySymbol(symbol);
    if (!stock) return;
    this.stockDetail = symbol;
    this._showModal(this._buildStockDetail(stock), `${stock.symbol} — ${stock.name}`);
  }

  _buildStockDetail(stock) {
    const pos = stock.changePercent >= 0;
    const news = this.data.getNewsBySymbol(stock.symbol);
    const sent = this.data.sentiment.find(s => s.symbol === stock.symbol);
    const inWL = this.watchlist.has(stock.symbol);

    return `
      <div class="stock-detail">
        <div class="sd-hero">
          <div class="sd-identity">
            <span class="sd-emoji">${stock.emoji}</span>
            <div>
              <h2 class="sd-symbol">${stock.symbol}</h2>
              <div class="sd-name">${stock.name}</div>
              <span class="sd-sector">${stock.sector}</span>
            </div>
          </div>
          <div class="sd-price-block">
            <div class="sd-price">$${stock.price.toFixed(2)}</div>
            <div class="sd-change ${pos ? 'pos' : 'neg'}">${pos ? '+' : ''}$${Math.abs(stock.change).toFixed(2)} (${pos ? '+' : ''}${stock.changePercent.toFixed(2)}%)</div>
            <div class="sd-mkt-status ${this.data.marketOpen ? 'open' : 'closed'}">${this.data.marketOpen ? '● Market Open' : '● After Hours'}</div>
          </div>
          <div class="sd-actions">
            <button class="btn ${inWL ? 'btn-secondary' : 'btn-primary'}" onclick="app.watchlist.toggle('${stock.symbol}'); app.renderWatchlist(); app.openStockDetail('${stock.symbol}')">
              ${inWL ? '⭐ Watchlisted' : '☆ Add to Watchlist'}
            </button>
            <button class="btn btn-green" onclick="app._closeModal(); app.navigate('paper'); setTimeout(() => document.getElementById('trade-symbol').value='${stock.symbol}', 300)">
              📊 Trade
            </button>
          </div>
        </div>

        <!-- TradingView Chart Widget -->
        <div class="sd-chart-container">
          <div class="tradingview-widget-container" style="height:400px">
            <div id="tv-chart-${stock.symbol}"></div>
            <script type="text/javascript">
              if (typeof TradingView !== 'undefined') {
                new TradingView.widget({
                  "width": "100%", "height": 380,
                  "symbol": "NASDAQ:${stock.symbol}",
                  "interval": "D", "timezone": "America/New_York",
                  "theme": "dark", "style": "1",
                  "locale": "en", "toolbar_bg": "#111827",
                  "enable_publishing": false, "hide_top_toolbar": false,
                  "hide_legend": false, "save_image": false,
                  "container_id": "tv-chart-${stock.symbol}"
                });
              } else {
                document.getElementById("tv-chart-${stock.symbol}").innerHTML = '<div class="chart-fallback"><div class="chart-placeholder"><span>📈</span><p>Interactive Chart</p><p style="font-size:0.8rem;color:#6b7280">TradingView chart for ${stock.symbol}</p></div></div>';
              }
            <\/script>
          </div>
        </div>

        <div class="sd-stats-grid">
          <div class="sd-stat"><span class="sd-stat-label">Market Cap</span><span class="sd-stat-value">${this._fmtCap(stock.marketCap)}</span></div>
          <div class="sd-stat"><span class="sd-stat-label">P/E Ratio</span><span class="sd-stat-value">${stock.pe ? stock.pe.toFixed(1) : 'N/A'}</span></div>
          <div class="sd-stat"><span class="sd-stat-label">Volume</span><span class="sd-stat-value">${this._fmtVol(stock.volume)}</span></div>
          <div class="sd-stat"><span class="sd-stat-label">Avg Volume</span><span class="sd-stat-value">${this._fmtVol(stock.avgVolume)}</span></div>
          <div class="sd-stat"><span class="sd-stat-label">52W High</span><span class="sd-stat-value pos">$${stock.week52High.toFixed(2)}</span></div>
          <div class="sd-stat"><span class="sd-stat-label">52W Low</span><span class="sd-stat-value neg">$${stock.week52Low.toFixed(2)}</span></div>
          <div class="sd-stat"><span class="sd-stat-label">Beta</span><span class="sd-stat-value">${stock.beta.toFixed(2)}</span></div>
          <div class="sd-stat"><span class="sd-stat-label">Sector</span><span class="sd-stat-value">${stock.sector}</span></div>
        </div>

        ${sent ? `
        <div class="sd-sentiment">
          <h4>Social Sentiment</h4>
          <div class="sent-bar-container">
            <span class="sent-bull">🐂 ${sent.bullish}% Bullish</span>
            <div class="sent-bar"><div class="sent-fill bull" style="width:${sent.bullish}%"></div></div>
            <span class="sent-bear">🐻 ${sent.bearish}% Bearish</span>
          </div>
          <div class="sent-mentions">${sent.mentions.toLocaleString()} mentions</div>
        </div>` : ''}

        <div class="sd-description">
          <h4>About ${stock.symbol}</h4>
          <p>${stock.description}</p>
        </div>

        ${news.length > 0 ? `
        <div class="sd-related-news">
          <h4>Related News</h4>
          ${news.slice(0, 3).map(n => `
            <div class="related-news-item" onclick="app._closeModal(); app.openNews(${n.id})">
              <span class="rn-emoji">${n.emoji}</span>
              <div>
                <div class="rn-headline">${n.headline}</div>
                <div class="rn-meta">${n.source} · ${this._relTime(n.timestamp)}</div>
              </div>
            </div>
          `).join('')}
        </div>` : ''}
      </div>
    `;
  }

  _refreshStockDetail() {
    const stock = this.data.getBySymbol(this.stockDetail);
    if (!stock) return;
    const modalTitle = document.querySelector('.modal-title');
    if (modalTitle) modalTitle.textContent = `${stock.symbol} — ${stock.name}`;
    // just update price & change in the existing detail
    const priceEl = document.querySelector('.sd-price');
    const changeEl = document.querySelector('.sd-change');
    if (priceEl) priceEl.textContent = `$${stock.price.toFixed(2)}`;
    if (changeEl) {
      const pos = stock.changePercent >= 0;
      changeEl.textContent = `${pos ? '+' : ''}$${Math.abs(stock.change).toFixed(2)} (${pos ? '+' : ''}${stock.changePercent.toFixed(2)}%)`;
      changeEl.className = `sd-change ${pos ? 'pos' : 'neg'}`;
    }
  }

  // ─── Sentiment ───────────────────────────────────────────────
  renderSentiment() {
    const el = document.getElementById('sentiment-grid');
    if (!el) return;
    const trending = this.data.getTrendingTickers();

    document.getElementById('trending-tickers').innerHTML = trending.map(t => {
      const pos = t.changePercent >= 0;
      return `
        <div class="trending-chip ${pos ? 'pos' : 'neg'}" onclick="app.openStockDetail('${t.symbol}')">
          <span class="tc-symbol">${t.symbol}</span>
          <span class="tc-mentions">${this._fmtK(t.mentions)}</span>
          <span class="tc-chg ${pos ? 'pos' : 'neg'}">${pos ? '+' : ''}${t.changePercent.toFixed(1)}%</span>
        </div>`;
    }).join('');

    el.innerHTML = this.data.sentiment.map(s => {
      const stock = this.data.getBySymbol(s.symbol);
      return `
        <div class="sentiment-card" onclick="app.openStockDetail('${s.symbol}')">
          <div class="sc-header">
            <div class="sc-identity">
              <span class="sc-symbol">${s.symbol}</span>
              <span class="sc-name">${stock ? stock.name.split(' ')[0] : ''}</span>
            </div>
            <div class="sc-price">
              ${stock ? `<span class="sc-pval">$${stock.price.toFixed(2)}</span>
              <span class="sc-pct ${stock.changePercent >= 0 ? 'pos' : 'neg'}">${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%</span>` : ''}
            </div>
          </div>
          <div class="sc-mentions">${s.mentions.toLocaleString()} social mentions</div>
          <div class="sc-bar-wrap">
            <div class="sc-bar">
              <div class="sc-bull" style="width: ${s.bullish}%" title="${s.bullish}% Bullish"></div>
              <div class="sc-bear" style="width: ${s.bearish}%" title="${s.bearish}% Bearish"></div>
            </div>
            <div class="sc-labels">
              <span class="pos">🐂 ${s.bullish}%</span>
              <span class="neg">🐻 ${s.bearish}%</span>
            </div>
          </div>
          ${s.trending ? '<div class="sc-trending">🔥 Trending</div>' : ''}
        </div>`;
    }).join('');
  }

  // ─── Sectors ─────────────────────────────────────────────────
  renderSectors() {
    const el = document.getElementById('sectors-grid');
    if (!el) return;
    el.innerHTML = this.data.sectors.map(sec => {
      const pos = sec.changePercent >= 0;
      return `
        <div class="sector-card">
          <div class="sector-emoji" style="background: ${sec.color}22; border-color: ${sec.color}44">${sec.emoji}</div>
          <div class="sector-info">
            <h3 class="sector-name">${sec.name}</h3>
            <div class="sector-meta">
              <span>${sec.stocks} stocks</span>
              <span>Mkt Cap: ${sec.marketCap}</span>
              <span>Top: <strong onclick="app.openStockDetail('${sec.topStock}')" style="cursor:pointer;color:var(--blue)">${sec.topStock}</strong></span>
            </div>
            ${sec.hot ? '<span class="hot-badge">🔥 HOT</span>' : ''}
          </div>
          <div class="sector-chg ${pos ? 'pos' : 'neg'}">
            <span class="pct-pill ${pos ? 'pos' : 'neg'} big">${pos ? '▲' : '▼'} ${Math.abs(sec.changePercent).toFixed(2)}%</span>
          </div>
        </div>`;
    }).join('');
  }

  // ─── Watchlist ───────────────────────────────────────────────
  renderWatchlist() {
    this.watchlist.render('watchlist-cards');
  }

  // ─── Alerts ──────────────────────────────────────────────────
  renderAlerts() {
    this.alertMgr.render('alerts-list');
  }

  _bindAlertForm() {
    const form = document.getElementById('alert-form');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const sym = document.getElementById('alert-symbol').value.trim();
      const cond = document.getElementById('alert-condition').value;
      const price = document.getElementById('alert-price').value;
      const result = this.alertMgr.createAlert({ symbol: sym, condition: cond, price });
      if (result.error) {
        this.alertMgr._showToast(`❌ ${result.error}`, 'error');
      } else {
        form.reset();
        this.renderAlerts();
      }
    });

    document.getElementById('alert-symbol').addEventListener('input', e => {
      const q = e.target.value.trim();
      const results = this.data.search(q);
      const list = document.getElementById('alert-symbol-suggestions');
      if (list) {
        list.innerHTML = results.slice(0, 5).map(s =>
          `<div class="suggestion" onclick="document.getElementById('alert-symbol').value='${s.symbol}'; document.getElementById('alert-symbol-suggestions').innerHTML=''; document.getElementById('alert-price').value='${s.price.toFixed(2)}';">${s.symbol} — ${s.name}</div>`
        ).join('');
      }
    });
  }

  // ─── Paper Trading ───────────────────────────────────────────
  renderPaperPortfolio() {
    this.paperTrading.render('paper-portfolio');
  }

  _bindTradeForm() {
    const form = document.getElementById('trade-form');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const sym = document.getElementById('trade-symbol').value.trim();
      const action = document.getElementById('trade-action').value;
      const shares = document.getElementById('trade-shares').value;
      const result = action === 'buy'
        ? this.paperTrading.buy(sym, shares)
        : this.paperTrading.sell(sym, shares);
      const msg = result.error ? `❌ ${result.error}` : `✅ ${result.message}`;
      const type = result.error ? 'error' : 'success';
      this.alertMgr._showToast(msg, type);
      if (result.success) {
        form.reset();
        this.renderPaperPortfolio();
      }
    });

    document.getElementById('trade-symbol').addEventListener('input', e => {
      const q = e.target.value.trim();
      if (q.length < 1) return;
      const results = this.data.search(q);
      const preview = document.getElementById('trade-preview');
      if (results.length > 0 && preview) {
        const stock = results[0];
        preview.innerHTML = `<span>${stock.symbol}</span> <span class="price">$${stock.price.toFixed(2)}</span> <span class="${stock.changePercent >= 0 ? 'pos' : 'neg'}">${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%</span>`;
      }
    });

    const sharesInput = document.getElementById('trade-shares');
    if (sharesInput) {
      sharesInput.addEventListener('input', () => this._updateTradeCost());
    }
  }

  _updateTradeCost() {
    const sym = document.getElementById('trade-symbol')?.value.trim();
    const shares = parseInt(document.getElementById('trade-shares')?.value || 0);
    const stock = sym ? this.data.getBySymbol(sym) : null;
    const costEl = document.getElementById('trade-cost');
    if (stock && shares && costEl) {
      costEl.textContent = `Estimated Cost: $${(stock.price * shares).toFixed(2)}`;
    }
  }

  showQuickSell(symbol, maxShares) {
    const shares = prompt(`Sell how many shares of ${symbol}? (max: ${maxShares})`, '100');
    if (!shares) return;
    const result = this.paperTrading.sell(symbol, shares);
    this.alertMgr._showToast(result.error ? `❌ ${result.error}` : `✅ ${result.message}`, result.error ? 'error' : 'success');
    if (result.success) this.renderPaperPortfolio();
  }

  // ─── Insider Trading ─────────────────────────────────────────
  renderInsider() {
    this.insiderTracker.render('insider-container');
  }

  // ─── Search ──────────────────────────────────────────────────
  _handleSearch(query) {
    const resultsEl = document.getElementById('search-results');
    if (!resultsEl) return;
    if (query.trim().length < 1) { resultsEl.style.display = 'none'; return; }
    const results = this.data.search(query);
    resultsEl.style.display = 'block';
    resultsEl.innerHTML = results.map(s => {
      const pos = s.changePercent >= 0;
      return `
        <div class="search-result" onclick="app._closeSearch(); app.openStockDetail('${s.symbol}')">
          <span class="sr-symbol">${s.symbol}</span>
          <span class="sr-name">${s.name.substring(0, 30)}</span>
          <span class="sr-price">$${s.price.toFixed(2)}</span>
          <span class="sr-chg ${pos ? 'pos' : 'neg'}">${pos ? '+' : ''}${s.changePercent.toFixed(2)}%</span>
        </div>`;
    }).join('') || '<div class="search-no-result">No results found</div>';
  }

  _closeSearch() {
    const el = document.getElementById('search-results');
    if (el) el.style.display = 'none';
  }

  // ─── Modal ───────────────────────────────────────────────────
  _showModal(content, title = '') {
    const overlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    if (!overlay) return;
    if (modalTitle) modalTitle.textContent = title;
    if (modalBody) modalBody.innerHTML = content;
    overlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  _closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.remove('visible');
    document.body.style.overflow = '';
    this.stockDetail = null;
  }

  // ─── Utilities ───────────────────────────────────────────────
  _relTime(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000)   return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000)return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  _fmtVol(n) {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
    if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  }

  _fmtCap(n) {
    if (n >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(2)}T`;
    if (n >= 1_000_000_000)     return `$${(n / 1_000_000_000).toFixed(2)}B`;
    if (n >= 1_000_000)         return `$${(n / 1_000_000).toFixed(2)}M`;
    return `$${n}`;
  }

  _fmtK(n) {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  }
}

// ─── Boot ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  window.app = new PulseMarketsApp();

  // Service Worker registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // Close modal on overlay click
  document.getElementById('modal-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'modal-overlay') app._closeModal();
  });

  // Close search when clicking outside
  document.addEventListener('click', e => {
    if (!e.target.closest('.search-container')) app._closeSearch();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      app._closeModal();
      app._closeSearch();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('search-input')?.focus();
    }
  });
});
