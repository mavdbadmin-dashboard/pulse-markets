// js/alerts.js — PulseMarkets Alert System

class AlertManager {
  constructor(marketData) {
    this.marketData = marketData;
    this.storageKey = 'pm_alerts';
    this.alerts = this._load();
    this._bindTrigger();
  }

  _load() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    } catch { return []; }
  }

  _save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.alerts));
  }

  _bindTrigger() {
    this.marketData.subscribe('alertTriggered', ({ alert, stock }) => {
      this._onTrigger(alert, stock);
    });
  }

  createAlert({ symbol, condition, price, note }) {
    const stock = this.marketData.getBySymbol(symbol);
    if (!stock) return { error: 'Symbol not found' };
    const alert = {
      id: Date.now(),
      symbol: symbol.toUpperCase(),
      condition,
      price: parseFloat(price),
      note: note || '',
      createdAt: Date.now(),
      active: true,
      triggeredAt: null,
    };
    this.alerts.unshift(alert);
    this._save();
    this._showToast(`🔔 Alert set: ${symbol} ${condition} $${price}`, 'info');
    return { success: true, alert };
  }

  deleteAlert(id) {
    this.alerts = this.alerts.filter(a => a.id !== id);
    this._save();
  }

  toggleAlert(id) {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) { alert.active = !alert.active; this._save(); }
  }

  _onTrigger(alert, stock) {
    alert.triggeredAt = Date.now();
    alert.active = false;
    this._save();

    const dir = alert.condition === 'above' ? '📈' : '📉';
    this._showToast(
      `${dir} ALERT: ${alert.symbol} is ${alert.condition === 'above' ? 'above' : 'below'} $${alert.price}! Current: $${stock.price.toFixed(2)}`,
      'alert',
      8000
    );

    if (Notification && Notification.permission === 'granted') {
      new Notification(`PulseMarkets Alert: ${alert.symbol}`, {
        body: `Price ${alert.condition} $${alert.price}. Now: $${stock.price.toFixed(2)}`,
        icon: '⚡',
      });
    }

    this._refreshUI();
  }

  _showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container') || this._createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span><button onclick="this.parentElement.remove()">×</button>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, duration);
  }

  _createToastContainer() {
    const div = document.createElement('div');
    div.id = 'toast-container';
    document.body.appendChild(div);
    return div;
  }

  _refreshUI() {
    if (window.app) app.renderAlerts();
  }

  render(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (this.alerts.length === 0) {
      el.innerHTML = '<div class="alerts-empty">No alerts set. Use the form below to add one.</div>';
      return;
    }
    el.innerHTML = this.alerts.map(a => {
      const stock = this.marketData.getBySymbol(a.symbol);
      const price = stock ? stock.price : '—';
      return `
        <div class="alert-row ${a.active ? '' : 'triggered'}" data-id="${a.id}">
          <div class="alert-symbol">${a.symbol}</div>
          <div class="alert-condition">${a.condition === 'above' ? '📈 Above' : '📉 Below'} $${a.price.toFixed(2)}</div>
          <div class="alert-current">Now: $${typeof price === 'number' ? price.toFixed(2) : price}</div>
          <div class="alert-status">${a.active ? '<span class="badge badge-active">Active</span>' : '<span class="badge badge-triggered">Triggered</span>'}</div>
          <div class="alert-actions">
            <button class="btn-icon" onclick="app.alertMgr.toggleAlert(${a.id}); app.renderAlerts();" title="${a.active ? 'Pause' : 'Resume'}">${a.active ? '⏸' : '▶'}</button>
            <button class="btn-icon btn-danger" onclick="app.alertMgr.deleteAlert(${a.id}); app.renderAlerts();" title="Delete">🗑</button>
          </div>
        </div>
      `;
    }).join('');
  }
}
