/* ─────────────────────────────────────────────────────────────
   ui.js — rendering only
   ───────────────────────────────────────────────────────────── */

const UI = {

  currency: '₹',
  view: 'yearly',   // 'yearly' | 'monthly'

  $(sel) { return document.querySelector(sel); },
  $$(sel) { return [...document.querySelectorAll(sel)]; },

  money(v, withSymbol = true) {
    const n = Number(v).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    return withSymbol ? this.currency + ' ' + n : n;
  },

  precise(v) {
    return this.currency + ' ' + Number(v).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  },

  error(message) {
    const el = this.$('#error');
    if (!message) { el.classList.add('hidden'); return; }
    el.textContent = message;
    el.classList.remove('hidden');
  },

  /** Paint every result surface from one summary object. */
  render(summary) {
    this.error(null);

    this.$('#emi').textContent = this.precise(summary.emi);
    this.$('#principal').textContent = this.money(summary.principal);
    this.$('#interest').textContent = this.money(summary.totalInterest);
    this.$('#total').textContent = this.money(summary.totalPayment);

    const principalShare = 100 - summary.interestShare;
    this.$('#pct-p').textContent = principalShare.toFixed(1) + '%';
    this.$('#pct-i').textContent = summary.interestShare.toFixed(1) + '%';
    this.$('#payoff').textContent =
      `${summary.months} instalments · paid off by ${EMI.payoffDate(summary.months)}`;

    const years = EMI.yearly(summary.rows);
    Chart.donut(this.$('#donut'), summary.principal, summary.totalInterest);
    Chart.balance(this.$('#balance-chart'), years, summary.principal);
    this.renderTable(summary, years);
  },

  renderTable(summary, years) {
    const body = this.$('#schedule tbody');
    this.$('#col-period').textContent = this.view === 'yearly' ? 'Year' : 'Month';
    body.innerHTML = '';

    const rows = this.view === 'yearly'
      ? years.map(y => [`Year ${y.year}`, y.principal, y.interest, y.payment, y.balance])
      : summary.rows.map(r => [`#${r.n}`, r.principal, r.interest, r.payment, r.balance]);

    const frag = document.createDocumentFragment();
    for (const [label, principal, interest, payment, balance] of rows) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${label}</td>
        <td class="good">${this.money(principal)}</td>
        <td class="warn">${this.money(interest)}</td>
        <td>${this.money(payment)}</td>
        <td class="${balance === 0 ? 'good' : ''}">${this.money(balance)}</td>`;
      frag.appendChild(tr);
    }
    body.appendChild(frag);
  },

  /** Keep a number box and its slider showing the same value. */
  pair(numberId, rangeId, onChange) {
    const num = this.$('#' + numberId);
    const range = this.$('#' + rangeId);

    num.addEventListener('input', () => {
      if (num.value !== '') range.value = num.value;
      onChange();
    });
    range.addEventListener('input', () => {
      num.value = range.value;
      onChange();
    });
  }
};
