/* ─────────────────────────────────────────────────────────────
   app.js — wiring
   Reads the controls, asks EMI for the numbers, hands them to UI.
   Load order: emi → chart → ui → app.
   ───────────────────────────────────────────────────────────── */

const App = {

  unit: 'years',   // how the tenure box is being read

  init() {
    UI.pair('amount', 'amount-range', () => this.calculate());
    UI.pair('rate', 'rate-range', () => this.calculate());
    UI.pair('tenure', 'tenure-range', () => this.calculate());

    this.bindUnitToggle();
    this.bindViewTabs();
    this.bindCurrency();

    window.addEventListener('resize', () => this.calculate());
    this.calculate();
  },

  /** Tenure typed in months is just tenure × 1; in years it is × 12. */
  months() {
    const value = Number(UI.$('#tenure').value);
    return this.unit === 'years' ? Math.round(value * 12) : Math.round(value);
  },

  calculate() {
    const summary = EMI.summary(
      UI.$('#amount').value,
      UI.$('#rate').value,
      this.months()
    );

    if (!summary.ok) { UI.error(summary.error); return; }
    UI.render(summary);
  },

  bindUnitToggle() {
    UI.$$('.unit').forEach(button => {
      button.addEventListener('click', () => {
        if (button.dataset.unit === this.unit) return;

        const tenure = UI.$('#tenure');
        const range = UI.$('#tenure-range');
        const current = Number(tenure.value);

        // convert the number the user is looking at, don't just relabel it
        this.unit = button.dataset.unit;
        const isYears = this.unit === 'years';
        const converted = isYears
          ? Math.max(1, Math.round(current / 12))
          : Math.round(current * 12);

        range.min = 1;
        range.max = isYears ? 30 : 360;
        range.step = isYears ? 1 : 6;
        tenure.value = range.value = converted;

        UI.$('#scale-min').textContent = '1';
        UI.$('#scale-max').textContent = isYears ? '30' : '360';

        UI.$$('.unit').forEach(b => b.classList.toggle('active', b === button));
        this.calculate();
      });
    });
  },

  bindViewTabs() {
    UI.$$('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        UI.$$('.tab').forEach(t => t.classList.toggle('active', t === tab));
        UI.view = tab.dataset.view;
        this.calculate();
      });
    });
  },

  bindCurrency() {
    UI.$('#currency').addEventListener('change', e => {
      UI.currency = e.target.value;
      UI.$$('.sym').forEach(s => { if (s.textContent !== '%') s.textContent = UI.currency; });
      this.calculate();
    });
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
