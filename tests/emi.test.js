/* ─────────────────────────────────────────────────────────────
   emi.test.js — plain Node, no dependencies.
   Run:  node tests/emi.test.js
   ───────────────────────────────────────────────────────────── */

const { EMI, LIMITS } = require('../js/emi.js');

let passed = 0, failed = 0;

function check(name, condition) {
  if (condition) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}`); }
}

const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// ── the formula ─────────────────────────────────────────────
console.log('\nEMI formula');
check('1,00,000 @ 12% for 12 months = 8,884.88',
  near(EMI.monthly(100000, 12, 12), 8884.88));
check('25,00,000 @ 8.5% for 240 months = 21,695.58',
  near(EMI.monthly(2500000, 8.5, 240), 21695.58));
check('agrees with the discount-factor form of the formula', (() => {
  const r = 8.5 / 1200, n = 240, P = 2500000;
  return near(EMI.monthly(P, 8.5, n), P * r / (1 - Math.pow(1 + r, -n)));
})());
check('a 0% loan is the principal spread evenly',
  EMI.monthly(120000, 0, 12) === 10000);
check('a longer tenure lowers the instalment',
  EMI.monthly(1000000, 9, 240) < EMI.monthly(1000000, 9, 120));
check('a higher rate raises the instalment',
  EMI.monthly(1000000, 12, 120) > EMI.monthly(1000000, 8, 120));
check('a single-month loan repays principal plus one month of interest',
  near(EMI.monthly(100000, 12, 1), 101000, 0.5));

// ── validation ──────────────────────────────────────────────
console.log('\nvalidation');
check('rejects an amount below the minimum', !EMI.summary(100, 10, 12).ok);
check('rejects a negative rate', !EMI.summary(500000, -1, 12).ok);
check('rejects a rate above 100%', !EMI.summary(500000, 120, 12).ok);
check('rejects a zero tenure', !EMI.summary(500000, 10, 0).ok);
check(`rejects a tenure beyond ${LIMITS.MAX_MONTHS} months`, !EMI.summary(500000, 10, 600).ok);
check('rejects text input', !EMI.summary('abc', 10, 12).ok);
check('accepts a valid loan', EMI.summary(500000, 10, 12).ok);

// ── the schedule ────────────────────────────────────────────
console.log('\namortization schedule');
const s = EMI.summary(2500000, 8.5, 240);
const rows = s.rows;

check('produces one row per instalment', rows.length === 240);
check('the balance ends at exactly zero', rows[rows.length - 1].balance === 0);
check('principal repaid equals the loan',
  near(rows.reduce((t, r) => t + r.principal, 0), 2500000));
check('interest rows sum to the reported total',
  near(rows.reduce((t, r) => t + r.interest, 0), s.totalInterest));
check('principal + interest = total payable',
  near(s.principal + s.totalInterest, s.totalPayment));
check('the balance never increases',
  rows.every((r, i) => i === 0 || r.balance <= rows[i - 1].balance));
check('early payments are mostly interest',
  rows[0].interest > rows[0].principal);
check('late payments are mostly principal',
  rows[rows.length - 1].principal > rows[rows.length - 1].interest);
check('the first interest charge is one month on the full amount',
  near(rows[0].interest, 2500000 * 0.085 / 12));
check('interest share is reported as a percentage',
  s.interestShare > 0 && s.interestShare < 100);

// ── zero-interest edge case ─────────────────────────────────
console.log('\nzero-interest loan');
const free = EMI.summary(120000, 0, 12);
check('charges no interest', free.totalInterest === 0);
check('total payable equals the principal', free.totalPayment === 120000);
check('every instalment is identical', new Set(free.rows.map(r => r.payment)).size === 1);

// ── yearly rollup ───────────────────────────────────────────
console.log('\nyearly rollup');
const years = EMI.yearly(rows);
check('20 years of rows', years.length === 20);
check('yearly principal sums back to the loan',
  near(years.reduce((t, y) => t + y.principal, 0), 2500000));
check('the final year closes the loan', years[years.length - 1].balance === 0);
check('a part year is still reported',
  EMI.yearly(EMI.summary(500000, 10, 18).rows).length === 2);

// ── payoff date ─────────────────────────────────────────────
console.log('\npayoff date');
check('12 months lands one year out',
  EMI.payoffDate(12, new Date(2026, 0, 1)).includes('2027'));

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
