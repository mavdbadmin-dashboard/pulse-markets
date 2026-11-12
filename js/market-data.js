// js/market-data.js — PulseMarkets Data Layer
// Demo data + simulated real-time updates + API hooks

class MarketData {
  constructor() {
    this.stocks = this._buildStockUniverse();
    this.listeners = new Map();
    this.updateInterval = null;
    this.marketOpen = this._isMarketOpen();
    this.indices = this._buildIndices();
    this.news = this._buildNews();
    this.sectors = this._buildSectors();
    this.sentiment = this._buildSentiment();
  }

  // ─── Subscription Model ─────────────────────────────────────────────────
  subscribe(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => cb(data));
    }
  }

  // ─── Simulated Real-Time Updates ────────────────────────────────────────
  startRealTimeUpdates() {
    this.updateInterval = setInterval(() => {
      const updatedSymbols = this._simulateTickUpdates();
      this.emit('priceUpdate', { symbols: updatedSymbols, stocks: this.stocks });
      this._checkAlertTriggers(updatedSymbols);
    }, 2500);
  }

  stopRealTimeUpdates() {
    if (this.updateInterval) clearInterval(this.updateInterval);
  }

  _simulateTickUpdates() {
    const count = Math.floor(Math.random() * 8) + 4;
    const shuffled = [...this.stocks].sort(() => Math.random() - 0.5).slice(0, count);
    const updated = [];

    shuffled.forEach(stock => {
      const volatility = stock.beta ? stock.beta * 0.0015 : 0.001;
      const drift = (Math.random() - 0.495) * volatility;
      const prevPrice = stock.price;
      stock.price = Math.max(0.01, +(stock.price * (1 + drift)).toFixed(2));
      stock.change = +(stock.price - stock.basePrice).toFixed(2);
      stock.changePercent = +((stock.change / stock.basePrice) * 100).toFixed(2);
      stock.volume += Math.floor(Math.random() * 15000);
      updated.push(stock.symbol);
    });

    this.indices.forEach(idx => {
      const drift = (Math.random() - 0.498) * 0.0004;
      idx.value = +(idx.value * (1 + drift)).toFixed(2);
      idx.change = +(idx.value - idx.baseValue).toFixed(2);
      idx.changePercent = +((idx.change / idx.baseValue) * 100).toFixed(2);
    });

    return updated;
  }

  _checkAlertTriggers(symbols) {
    try {
      const alerts = JSON.parse(localStorage.getItem('pm_alerts') || '[]');
      alerts.forEach(alert => {
        if (!alert.active || !symbols.includes(alert.symbol)) return;
        const stock = this.getBySymbol(alert.symbol);
        if (!stock) return;
        let triggered = false;
        if (alert.condition === 'above' && stock.price >= alert.price) triggered = true;
        if (alert.condition === 'below' && stock.price <= alert.price) triggered = true;
        if (triggered) this.emit('alertTriggered', { alert, stock });
      });
    } catch (e) {}
  }

  _isMarketOpen() {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getUTCHours();
    const min = now.getUTCMinutes();
    const timeMin = hour * 60 + min;
    return day > 0 && day < 6 && timeMin >= 870 && timeMin <= 1200; // 14:30–20:00 UTC
  }

  // ─── Accessors ──────────────────────────────────────────────────────────
  getBySymbol(symbol) {
    return this.stocks.find(s => s.symbol === symbol.toUpperCase()) || null;
  }

  search(query) {
    const q = query.toLowerCase();
    return this.stocks.filter(s =>
      s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    ).slice(0, 10);
  }

  getTopGainers(limit = 25) {
    return [...this.stocks].sort((a, b) => b.changePercent - a.changePercent).slice(0, limit);
  }

  getTopLosers(limit = 25) {
    return [...this.stocks].sort((a, b) => a.changePercent - b.changePercent).slice(0, limit);
  }

  getMostActive(limit = 25) {
    return [...this.stocks].sort((a, b) => b.volume - a.volume).slice(0, limit);
  }

  getNewsBySymbol(symbol) {
    return this.news.filter(n => n.tickers && n.tickers.includes(symbol));
  }

  getNewsByCategory(cat) {
    if (cat === 'all') return this.news;
    return this.news.filter(n => n.category === cat);
  }

  getTrendingTickers() {
    const pool = [...this.stocks].sort(() => Math.random() - 0.5).slice(0, 12);
    return pool.map(s => ({
      symbol: s.symbol,
      mentions: Math.floor(Math.random() * 15000) + 1000,
      sentiment: Math.random() > 0.5 ? 'bullish' : 'bearish',
      price: s.price,
      changePercent: s.changePercent
    }));
  }

  // ─── Stock Universe ──────────────────────────────────────────────────────
  _buildStockUniverse() {
    const raw = [
      // Symbol, Name, Price, Change%, AvgVol(M), MarketCap(B), PE, Beta, 52wkH, 52wkL, Sector, Emoji
      ['NVDA','NVIDIA Corporation',                 875.40,  3.84, 42.1, 2160, 65.2, 1.68, 974.00, 403.11, 'Technology', '🟢'],
      ['AAPL','Apple Inc.',                         189.30,  1.14, 54.0, 2940, 29.1, 1.21, 199.62, 143.90, 'Technology', '🍎'],
      ['MSFT','Microsoft Corporation',              415.70,  0.87, 20.3, 3100, 36.4, 0.90, 430.82, 309.45, 'Technology', '🪟'],
      ['GOOGL','Alphabet Inc. Class A',             174.50, -0.43, 25.8, 2160, 23.1, 1.05, 193.31, 115.83, 'Technology', '🔍'],
      ['AMZN','Amazon.com Inc.',                    195.20,  1.92, 36.4, 2020, 44.8, 1.14, 201.20, 101.26, 'Consumer Disc.', '📦'],
      ['META','Meta Platforms Inc.',                537.90,  2.15, 15.9, 1370, 27.3, 1.22, 544.97, 219.37, 'Technology', '👥'],
      ['TSLA','Tesla Inc.',                         248.50, -1.73, 108.4,  793, 62.1, 2.01, 299.29, 138.80, 'Consumer Disc.', '⚡'],
      ['AVGO','Broadcom Inc.',                      165.80,  2.63,  9.2,  776, 31.4, 1.14, 185.16,  61.18, 'Technology', '💾'],
      ['ORCL','Oracle Corporation',                 134.70,  0.56,  8.9,  370, 23.8, 0.77, 141.14,  87.37, 'Technology', '🔮'],
      ['AMD','Advanced Micro Devices',              178.60,  4.21, 46.3,  289, 48.9, 1.74, 227.30, 100.65, 'Technology', '🔴'],
      ['NFLX','Netflix Inc.',                       692.40,  1.03,  5.2,  299, 42.1, 1.09, 700.58, 344.34, 'Comm. Services','🎬'],
      ['JPM','JPMorgan Chase & Co.',                198.70,  0.38,  9.8,  582, 11.4, 1.14, 205.90, 141.36, 'Financials',   '🏦'],
      ['GS','Goldman Sachs Group',                  478.30,  0.72,  2.7,  157, 14.2, 1.37, 503.68, 299.76, 'Financials',   '💰'],
      ['BAC','Bank of America Corp.',                38.90, -0.26, 34.2,  309, 12.1, 1.26,  44.44,  24.96, 'Financials',   '🏦'],
      ['MS','Morgan Stanley',                       102.70,  0.14,  6.9,  165, 16.3, 1.29, 110.38,  73.17, 'Financials',   '📈'],
      ['WMT','Walmart Inc.',                         73.80,  0.68,  8.2,  596, 29.4, 0.47,  74.22,  47.08, 'Consumer Stap.','🛒'],
      ['HD','Home Depot Inc.',                      373.50, -0.31,  3.7,  370, 23.1, 1.03, 377.42, 265.33, 'Consumer Disc.','🔨'],
      ['JNJ','Johnson & Johnson',                   149.90, -0.14,  7.3,  384,  -1.0, 0.56, 175.97, 143.13, 'Healthcare',   '💊'],
      ['PFE','Pfizer Inc.',                          27.40, -1.08, 24.1,  154,  -1.0, 0.56,  43.30,  25.20, 'Healthcare',   '💉'],
      ['XOM','Exxon Mobil Corporation',             115.60,  1.47,  16.8,  489, 13.9, 0.85, 123.75,  90.76, 'Energy',       '⛽'],
      ['CVX','Chevron Corporation',                 155.40,  0.84,   9.4,  293, 12.1, 0.82, 189.68, 139.62, 'Energy',       '⛽'],
      ['PLTR','Palantir Technologies',               22.80,  5.63, 61.4,   47, 68.4, 1.98,  27.50,  10.79, 'Technology',   '🛡️'],
      ['SNOW','Snowflake Inc.',                     154.30,  2.14, 10.2,   53,  -1.0, 1.52, 237.72, 108.11, 'Technology',   '❄️'],
      ['CRWD','CrowdStrike Holdings',               312.80,  3.47,  5.8,   76, 384.2, 1.14, 358.00, 136.15, 'Technology',   '🦅'],
      ['NET','Cloudflare Inc.',                      89.40,  2.89, 12.3,   30,  -1.0, 1.26, 130.86,  47.25, 'Technology',   '☁️'],
      ['DDOG','Datadog Inc.',                       127.60,  1.78,  5.4,   40,  -1.0, 1.42, 155.59,  69.73, 'Technology',   '🐶'],
      ['ZS','Zscaler Inc.',                         225.40,  2.63,  4.8,   33,  -1.0, 1.21, 285.83, 121.00, 'Technology',   '🔒'],
      ['MDB','MongoDB Inc.',                        395.10, -0.84,  4.2,   27,  -1.0, 1.65, 481.11, 185.75, 'Technology',   '🍃'],
      ['COIN','Coinbase Global Inc.',               201.70,  7.84, 20.3,   51, 48.4, 2.84, 283.60,  52.20, 'Financials',   '🪙'],
      ['MARA','Marathon Digital Holdings',           21.40, 11.23, 48.7,    4,  -1.0, 3.42,  32.63,   5.33, 'Technology',   '⛏️'],
      ['RIOT','Riot Platforms Inc.',                 12.80,  9.47, 32.1,    3,  -1.0, 3.21,  22.50,   5.73, 'Technology',   '⛏️'],
      ['CLSK','CleanSpark Inc.',                     18.90, 12.14, 22.8,    2,  -1.0, 3.14,  28.42,   3.84, 'Technology',   '⚡'],
      ['HUT','Hut 8 Mining Corp.',                   8.40,  8.39, 14.2,    1,  -1.0, 3.08,  13.50,   1.47, 'Technology',   '⛏️'],
      ['RIVN','Rivian Automotive Inc.',              16.90, -2.31, 32.4,   16,  -1.0, 1.84,  28.06,  10.05, 'Consumer Disc.','🚗'],
      ['LCID','Lucid Group Inc.',                    3.20, -3.61, 42.1,    7,  -1.0, 1.72,   8.40,   2.88, 'Consumer Disc.','🔋'],
      ['NIO','NIO Inc.',                              5.80, -1.69, 38.4,   10,  -1.0, 1.63,  16.19,   3.61, 'Consumer Disc.','🚘'],
      ['SOFI','SoFi Technologies Inc.',               8.90,  3.84, 28.4,    8,  -1.0, 1.52,  12.14,   5.72, 'Financials',   '💳'],
      ['HOOD','Robinhood Markets Inc.',              18.70,  4.47, 18.3,   16,  -1.0, 1.84,  24.90,   7.96, 'Financials',   '🏹'],
      ['UPST','Upstart Holdings Inc.',               31.40,  6.43, 12.1,    3,  -1.0, 2.14,  70.75,  11.56, 'Financials',   '🚀'],
      ['AFRM','Affirm Holdings Inc.',                42.80,  4.38, 14.7,   13,  -1.0, 2.31,  65.09,  13.44, 'Financials',   '💳'],
      ['AMC','AMC Entertainment Holdings',            4.30, -4.44, 24.8,    1,  -1.0, 2.04,  22.49,   3.27, 'Comm. Services','🎭'],
      ['GME','GameStop Corp.',                       14.80,  2.78, 10.4,    7, 184.3, 1.84,  39.96,  10.14, 'Consumer Disc.','🎮'],
      ['BB','BlackBerry Limited',                     2.90, -1.69,  7.2,    1,  -1.0, 1.41,   7.17,   2.37, 'Technology',   '📱'],
      ['IONQ','IonQ Inc.',                           18.60, 14.73, 18.4,    3,  -1.0, 2.84,  36.00,   4.80, 'Technology',   '⚛️'],
      ['QUBT','Quantum Computing Inc.',               3.40,  8.60,  6.3,    0,  -1.0, 3.21,   7.14,   0.65, 'Technology',   '⚛️'],
      ['SOUN','SoundHound AI Inc.',                   4.80,  7.87, 32.7,    2,  -1.0, 3.14,  12.60,   1.14, 'Technology',   '🎵'],
      ['SPCE','Virgin Galactic Holdings',              2.10, -6.67,  5.2,    0,  -1.0, 1.98,  13.56,   1.36, 'Industrials',  '🚀'],
      ['CHPT','ChargePoint Holdings Inc.',             2.80, -3.45, 12.1,    1,  -1.0, 1.72,   9.42,   1.80, 'Industrials',  '⚡'],
      ['BILL','Bill.com Holdings Inc.',              82.40,  1.63,  6.7,   13,  -1.0, 1.38, 184.91,  54.96, 'Technology',   '💸'],
      ['GTLB','GitLab Inc.',                         60.70,  2.03,  4.2,   10,  -1.0, 1.21, 76.50,   37.23, 'Technology',   '🦊'],
    ];

    return raw.map(([symbol, name, price, changePercent, avgVol, mktCap, pe, beta, h52, l52, sector, emoji]) => {
      const basePrice = +(price / (1 + changePercent / 100)).toFixed(2);
      const change = +(price - basePrice).toFixed(2);
      return {
        symbol, name, price, change, changePercent, beta, sector,
        basePrice,
        avgVolume: avgVol * 1_000_000,
        volume: Math.floor(avgVol * (0.5 + Math.random() * 1.2) * 1_000_000),
        marketCap: mktCap * 1_000_000_000,
        pe: pe === -1.0 ? null : pe,
        week52High: h52,
        week52Low: l52,
        emoji,
        description: this._getDescription(symbol),
      };
    });
  }

  _getDescription(symbol) {
    const descs = {
      NVDA: 'NVIDIA designs and manufactures graphics processing units (GPUs) and system-on-chip units. The company is a leader in AI accelerator chips used in data centers, gaming, and autonomous vehicles.',
      AAPL: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories. The company is known for the iPhone, Mac, iPad, and a broad ecosystem of services.',
      MSFT: 'Microsoft develops, licenses, and supports software, services, devices, and solutions. Products include Windows, Office 365, Azure cloud services, and the LinkedIn professional network.',
      GOOGL: 'Alphabet Inc. is a holding company that includes Google and several other businesses. Google offers online advertising technologies, search, cloud computing, software, and hardware.',
      AMZN: 'Amazon.com is a multinational technology company focused on e-commerce, cloud computing, digital streaming, and AI. Amazon Web Services (AWS) is a leading cloud platform.',
      META: 'Meta Platforms operates social media platforms including Facebook, Instagram, WhatsApp, and Messenger. The company is investing heavily in the metaverse and AI infrastructure.',
      TSLA: 'Tesla designs and manufactures electric vehicles, energy storage systems, and solar products. The company operates the largest global EV charging network.',
      COIN: 'Coinbase Global is a cryptocurrency exchange platform offering trading, custody, and financial services for digital assets including Bitcoin and Ethereum.',
      NVDA: 'NVIDIA Corporation designs graphics processing units, data center chips, and system-on-chip units. The company is the dominant supplier of AI training hardware.',
      PLTR: 'Palantir Technologies builds software platforms for intelligence analysis, operational decision-making, and AI deployment across government and commercial sectors.',
    };
    return descs[symbol] || `${symbol} is a publicly traded company providing products and services in its respective industry. The company operates across multiple business segments with a focus on growth and profitability.`;
  }

  // ─── Market Indices ──────────────────────────────────────────────────────
  _buildIndices() {
    return [
      { symbol: 'SPX', name: 'S&P 500',   value: 5234.18, baseValue: 5218.42, change: 15.76, changePercent: 0.30 },
      { symbol: 'NDX', name: 'NASDAQ 100', value: 18312.44, baseValue: 18201.33, change: 111.11, changePercent: 0.61 },
      { symbol: 'DJI', name: 'Dow Jones', value: 39118.86, baseValue: 39203.37, change: -84.51, changePercent: -0.22 },
      { symbol: 'VIX', name: 'VIX',       value: 15.84,  baseValue: 16.21, change: -0.37, changePercent: -2.28 },
      { symbol: 'DXY', name: 'USD Index', value: 104.21, baseValue: 104.08, change: 0.13, changePercent: 0.12 },
      { symbol: 'BTC', name: 'Bitcoin',   value: 68420,  baseValue: 67100, change: 1320, changePercent: 1.97 },
    ];
  }

  // ─── News Articles ───────────────────────────────────────────────────────
  _buildNews() {
    return [
      {
        id: 1,
        headline: 'NVIDIA Surges After Record Data Center Revenue Crushes Expectations',
        snippet: 'NVIDIA reported quarterly revenue of $22.1 billion, smashing Wall Street estimates by 12%. CEO Jensen Huang called it "the beginning of the next industrial revolution" as AI chip demand continues to accelerate globally.',
        source: 'Reuters', author: 'Sarah Chen', timestamp: Date.now() - 1800000,
        category: 'earnings', tickers: ['NVDA', 'AMD', 'INTC'],
        emoji: '🟢', gradient: 'linear-gradient(135deg, #10b981, #064e3b)',
        readTime: '3 min read', hot: true,
      },
      {
        id: 2,
        headline: 'Federal Reserve Signals Possible Rate Cut Path as Inflation Cools',
        snippet: 'Fed Chair Jerome Powell hinted at potential policy easing as CPI data showed inflation dropping to 2.7% — the lowest in three years. Markets rallied broadly on the news.',
        source: 'Bloomberg', author: 'James Whitfield', timestamp: Date.now() - 3600000,
        category: 'macro', tickers: ['SPY', 'QQQ', 'TLT'],
        emoji: '📉', gradient: 'linear-gradient(135deg, #3b82f6, #1e3a5f)',
        readTime: '5 min read', hot: true,
      },
      {
        id: 3,
        headline: 'Bitcoin Breaks Above $68K as ETF Inflows Hit Monthly Record',
        snippet: 'Spot Bitcoin ETFs recorded over $1.2 billion in inflows this week alone, pushing BTC to its highest level since the April halving. Analysts now target $75,000 as the next resistance level.',
        source: 'CoinDesk', author: 'Marcus Rivera', timestamp: Date.now() - 5400000,
        category: 'crypto', tickers: ['COIN', 'MARA', 'RIOT', 'CLSK'],
        emoji: '🪙', gradient: 'linear-gradient(135deg, #f59e0b, #78350f)',
        readTime: '4 min read', hot: true,
      },
      {
        id: 4,
        headline: "Palantir Wins $500M Pentagon AI Contract, Stock Jumps 6%",
        snippet: "Palantir Technologies secured a major U.S. Department of Defense contract to expand its Maven Smart System AI platform. The deal cements Palantir's position as the premier AI partner for national security applications.",
        source: 'Wall Street Journal', author: 'Elena Marsh', timestamp: Date.now() - 7200000,
        category: 'contracts', tickers: ['PLTR'],
        emoji: '🛡️', gradient: 'linear-gradient(135deg, #6366f1, #312e81)',
        readTime: '3 min read', hot: false,
      },
      {
        id: 5,
        headline: 'Tesla Delivers 500K+ Vehicles in Q3, Beats Analyst Consensus',
        snippet: 'Tesla delivered 516,000 vehicles in Q3, exceeding the analyst consensus of 463,000. The beat was driven by strong demand for the refreshed Model 3 and aggressive pricing in China.',
        source: 'CNBC', author: 'David Park', timestamp: Date.now() - 10800000,
        category: 'earnings', tickers: ['TSLA', 'RIVN', 'LCID'],
        emoji: '⚡', gradient: 'linear-gradient(135deg, #ef4444, #7f1d1d)',
        readTime: '4 min read', hot: false,
      },
      {
        id: 6,
        headline: 'Microsoft Azure Gains Market Share as AI Services Drive Cloud Growth',
        snippet: 'Microsoft reported Azure grew 28% year-over-year, with AI services now contributing 7 percentage points of growth. The company raised its full-year guidance on the strength of Copilot adoption.',
        source: 'Forbes', author: 'Amy Liu', timestamp: Date.now() - 14400000,
        category: 'earnings', tickers: ['MSFT', 'GOOGL', 'AMZN'],
        emoji: '☁️', gradient: 'linear-gradient(135deg, #0ea5e9, #0c4a6e)',
        readTime: '5 min read', hot: false,
      },
      {
        id: 7,
        headline: "GameStop's CFO Departs Amid Speculation Over Bitcoin Treasury Strategy",
        snippet: 'GameStop announced the surprise departure of its CFO, fueling speculation that the company may be pivoting toward a Bitcoin treasury strategy similar to MicroStrategy.',
        source: 'MarketWatch', author: 'Tyler Brooks', timestamp: Date.now() - 18000000,
        category: 'corporate', tickers: ['GME'],
        emoji: '🎮', gradient: 'linear-gradient(135deg, #8b5cf6, #4c1d95)',
        readTime: '2 min read', hot: false,
      },
      {
        id: 8,
        headline: 'IonQ Lands 3 Quantum Computing Contracts Worth $45M in a Single Week',
        snippet: 'IonQ announced contracts with a European defense contractor, a pharmaceutical company, and a U.S. government agency — validating commercial quantum computing demand years ahead of expectations.',
        source: 'TechCrunch', author: 'Rachel Kim', timestamp: Date.now() - 21600000,
        category: 'contracts', tickers: ['IONQ', 'QUBT', 'RGTI'],
        emoji: '⚛️', gradient: 'linear-gradient(135deg, #06b6d4, #164e63)',
        readTime: '3 min read', hot: true,
      },
      {
        id: 9,
        headline: 'SoFi Stock Pops on Surprise Profitability and Upward Guidance Revision',
        snippet: 'SoFi Technologies reported its third consecutive profitable quarter, with net income of $43M. Management raised full-year guidance, citing growth in its high-yield savings accounts and lending products.',
        source: 'Seeking Alpha', author: 'Carlos Mendez', timestamp: Date.now() - 25200000,
        category: 'earnings', tickers: ['SOFI', 'HOOD', 'UPST'],
        emoji: '📱', gradient: 'linear-gradient(135deg, #10b981, #065f46)',
        readTime: '4 min read', hot: false,
      },
      {
        id: 10,
        headline: 'Energy Sector Leads Market Gains as Oil Spikes on Middle East Tensions',
        snippet: 'WTI crude oil surged 4.2% to $89 per barrel as geopolitical tensions raised supply concerns. ExxonMobil and Chevron shares hit multi-month highs as energy stocks outperformed the broader market.',
        source: 'Reuters', author: 'Mohammed Al-Rashid', timestamp: Date.now() - 28800000,
        category: 'macro', tickers: ['XOM', 'CVX', 'COP'],
        emoji: '⛽', gradient: 'linear-gradient(135deg, #f59e0b, #451a03)',
        readTime: '3 min read', hot: false,
      },
      {
        id: 11,
        headline: 'Coinbase Revenue Surges 90% as Crypto Trading Volumes Explode',
        snippet: "Coinbase's Q3 earnings showed transaction revenue up 90% QoQ as crypto markets saw their most active trading period in two years. The exchange reported $1.1B in quarterly revenue.",
        source: 'Bloomberg', author: 'Nicole Torres', timestamp: Date.now() - 32400000,
        category: 'earnings', tickers: ['COIN', 'HOOD'],
        emoji: '🪙', gradient: 'linear-gradient(135deg, #f59e0b, #78350f)',
        readTime: '3 min read', hot: false,
      },
      {
        id: 12,
        headline: 'AMD Partners with Meta on Next-Gen AI Accelerator Infrastructure',
        snippet: 'Advanced Micro Devices announced a multi-billion dollar partnership with Meta Platforms to supply MI300X AI accelerators for Llama AI model training. AMD shares jumped 5% on the news.',
        source: 'The Verge', author: 'Jason Wong', timestamp: Date.now() - 36000000,
        category: 'corporate', tickers: ['AMD', 'META', 'NVDA'],
        emoji: '🔴', gradient: 'linear-gradient(135deg, #ef4444, #7f1d1d)',
        readTime: '3 min read', hot: false,
      },
      {
        id: 13,
        headline: 'Rivian Shares Plunge After Trimming Production Guidance Citing Part Shortages',
        snippet: 'Rivian cut its full-year production guidance from 57,000 to 47,000 vehicles due to component supply constraints. The company said it expects the shortage to ease in Q1 next year.',
        source: 'Electrek', author: 'Parker Hunt', timestamp: Date.now() - 39600000,
        category: 'corporate', tickers: ['RIVN', 'LCID', 'NIO'],
        emoji: '🚗', gradient: 'linear-gradient(135deg, #ef4444, #450a0a)',
        readTime: '2 min read', hot: false,
      },
      {
        id: 14,
        headline: 'CrowdStrike Raises Guidance After Record Enterprise Customer Wins',
        snippet: 'CrowdStrike reported ARR growth of 33% and raised FY25 guidance to $3.9B. The company added 603 new subscription customers in the quarter, bringing total to over 23,000 enterprises.',
        source: 'Business Insider', author: 'Kate Morrison', timestamp: Date.now() - 43200000,
        category: 'earnings', tickers: ['CRWD', 'ZS', 'NET'],
        emoji: '🦅', gradient: 'linear-gradient(135deg, #ef4444, #3b0764)',
        readTime: '4 min read', hot: false,
      },
      {
        id: 15,
        headline: 'Warren Buffett Trims Apple Position Again, Builds Cash Pile to Record $157B',
        snippet: "Berkshire Hathaway's latest 13F filing reveals further trimming of its Apple stake, reducing the position by 25%. Buffett's cash pile hit a record $157 billion, fueling speculation about a major acquisition.",
        source: 'Financial Times', author: 'Oliver Kent', timestamp: Date.now() - 50400000,
        category: 'corporate', tickers: ['AAPL', 'BRK.B'],
        emoji: '🍎', gradient: 'linear-gradient(135deg, #64748b, #1e293b)',
        readTime: '5 min read', hot: false,
      },
    ];
  }

  // ─── Sector Performance ──────────────────────────────────────────────────
  _buildSectors() {
    return [
      { name: 'Artificial Intelligence',  changePercent:  7.84, marketCap: '8.4T', topStock: 'NVDA', stocks: 142, hot: true,  color: '#6366f1', emoji: '🤖' },
      { name: 'Cryptocurrency & Blockchain', changePercent: 11.23, marketCap: '2.1T', topStock: 'COIN', stocks: 48, hot: true, color: '#f59e0b', emoji: '🪙' },
      { name: 'Quantum Computing',        changePercent:  9.47, marketCap: '84B',  topStock: 'IONQ', stocks: 18, hot: true,  color: '#06b6d4', emoji: '⚛️' },
      { name: 'Cloud Infrastructure',     changePercent:  2.63, marketCap: '5.6T', topStock: 'MSFT', stocks: 213, hot: false, color: '#3b82f6', emoji: '☁️' },
      { name: 'Cybersecurity',            changePercent:  3.14, marketCap: '412B', topStock: 'CRWD', stocks: 76, hot: false,  color: '#10b981', emoji: '🛡️' },
      { name: 'Electric Vehicles',        changePercent: -2.84, marketCap: '1.1T', topStock: 'TSLA', stocks: 54, hot: false,  color: '#ef4444', emoji: '⚡' },
      { name: 'Energy & Oil',             changePercent:  1.84, marketCap: '3.2T', topStock: 'XOM',  stocks: 180, hot: false, color: '#f59e0b', emoji: '⛽' },
      { name: 'Fintech & Payments',       changePercent:  2.47, marketCap: '842B', topStock: 'SOFI', stocks: 94, hot: false,  color: '#8b5cf6', emoji: '💳' },
      { name: 'Biotech & Pharma',         changePercent: -0.84, marketCap: '1.8T', topStock: 'PFE',  stocks: 310, hot: false, color: '#64748b', emoji: '🧬' },
      { name: 'Consumer Discretionary',   changePercent:  0.42, marketCap: '4.1T', topStock: 'AMZN', stocks: 247, hot: false, color: '#10b981', emoji: '🛒' },
    ];
  }

  // ─── Sentiment Data ──────────────────────────────────────────────────────
  _buildSentiment() {
    return [
      { symbol: 'NVDA', bullish: 87, bearish: 13, mentions: 48291, trending: true },
      { symbol: 'TSLA', bullish: 52, bearish: 48, mentions: 61847, trending: true },
      { symbol: 'COIN', bullish: 78, bearish: 22, mentions: 29384, trending: true },
      { symbol: 'AAPL', bullish: 71, bearish: 29, mentions: 34928, trending: false },
      { symbol: 'AMD',  bullish: 83, bearish: 17, mentions: 18473, trending: true },
      { symbol: 'GME',  bullish: 61, bearish: 39, mentions: 42819, trending: true },
      { symbol: 'PLTR', bullish: 74, bearish: 26, mentions: 22841, trending: false },
      { symbol: 'MARA', bullish: 69, bearish: 31, mentions: 15293, trending: true },
      { symbol: 'IONQ', bullish: 81, bearish: 19, mentions: 11284, trending: true },
      { symbol: 'RIVN', bullish: 38, bearish: 62, mentions: 9847, trending: false },
      { symbol: 'SOFI', bullish: 76, bearish: 24, mentions: 8392, trending: false },
      { symbol: 'MSFT', bullish: 79, bearish: 21, mentions: 21847, trending: false },
    ];
  }
}
