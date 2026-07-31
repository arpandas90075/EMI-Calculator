/* ─────────────────────────────────────────────────────────────
   emi.js — the loan maths
   Reducing-balance method:

        EMI = P · r · (1 + r)^n / ((1 + r)^n − 1)

   where r is the monthly rate and n the number of instalments.
   Pure functions only — no DOM here, so tests/emi.test.js can run
   this file straight in Node.
   ───────────────────────────────────────────────────────────── */

const LIMITS = {
  MIN_AMOUNT: 1000,
  MAX_AMOUNT: 1e9,
  MAX_RATE: 100,       // % per year
  MAX_MONTHS: 480      // 40 years
};

const EMI = {

  round(v) {
    return Math.round((v + Number.EPSILON) * 100) / 100;
  },

  /** Returns null when the inputs are unusable, otherwise clean numbers. */
  validate(amount, annualRate, months) {
    const P = Number(amount);
    const R = Number(annualRate);
    const N = Math.round(Number(months));

    if (!Number.isFinite(P) || P < LIMITS.MIN_AMOUNT)
      return { ok: false, error: `Loan amount must be at least ${LIMITS.MIN_AMOUNT}.` };
    if (P > LIMITS.MAX_AMOUNT)
      return { ok: false, error: 'Loan amount is unrealistically large.' };
    if (!Number.isFinite(R) || R < 0 || R > LIMITS.MAX_RATE)
      return { ok: false, error: `Interest rate must be between 0 and ${LIMITS.MAX_RATE}%.` };
    if (!Number.isFinite(N) || N < 1 || N > LIMITS.MAX_MONTHS)
      return { ok: false, error: `Tenure must be between 1 and ${LIMITS.MAX_MONTHS} months.` };

    return { ok: true, P, R, N };
  },

  /** The instalment itself. A 0% loan is simply the principal spread evenly. */
  monthly(amount, annualRate, months) {
    const r = annualRate / 12 / 100;
    if (r === 0) return this.round(amount / months);
    const growth = Math.pow(1 + r, months);
    return this.round((amount * r * growth) / (growth - 1));
  },

  /**
   * Month-by-month breakdown. The final instalment absorbs the rounding
   * drift so the balance lands exactly on zero.
   */
  schedule(amount, annualRate, months) {
    const r = annualRate / 12 / 100;
    const emi = this.monthly(amount, annualRate, months);
    const rows = [];
    let balance = amount;

    for (let n = 1; n <= months; n++) {
      const interest = this.round(balance * r);
      let principal = this.round(emi - interest);
      let payment = emi;

      if (n === months || principal >= balance) {   // settle the loan
        principal = this.round(balance);
        payment = this.round(principal + interest);
      }

      balance = this.round(balance - principal);
      rows.push({ n, payment, interest, principal, balance });
      if (balance <= 0) break;
    }
    return rows;
  },

  /** Headline numbers, derived from the schedule so they always agree. */
  summary(amount, annualRate, months) {
    const check = this.validate(amount, annualRate, months);
    if (!check.ok) return check;

    const { P, R, N } = check;
    const rows = this.schedule(P, R, N);
    const totalInterest = this.round(rows.reduce((s, x) => s + x.interest, 0));
    const totalPayment = this.round(P + totalInterest);

    return {
      ok: true,
      emi: this.monthly(P, R, N),
      principal: P,
      totalInterest,
      totalPayment,
      months: rows.length,
      interestShare: this.round((totalInterest / totalPayment) * 100),
      rows
    };
  },

  /** Collapse the monthly rows into one row per 12 instalments. */
  yearly(rows) {
    const years = [];
    for (const row of rows) {
      const idx = Math.floor((row.n - 1) / 12);
      if (!years[idx]) years[idx] = { year: idx + 1, principal: 0, interest: 0, payment: 0, balance: 0 };
      const y = years[idx];
      y.principal += row.principal;
      y.interest += row.interest;
      y.payment += row.payment;
      y.balance = row.balance;
    }
    return years.map(y => ({
      ...y,
      principal: this.round(y.principal),
      interest: this.round(y.interest),
      payment: this.round(y.payment)
    }));
  },

  /** Calendar month the loan finishes, e.g. "Jul 2046". */
  payoffDate(months, from = new Date()) {
    const d = new Date(from.getFullYear(), from.getMonth() + months, 1);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
};

if (typeof module !== 'undefined') module.exports = { EMI, LIMITS };
