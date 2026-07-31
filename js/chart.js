/* ─────────────────────────────────────────────────────────────
   chart.js — two hand-drawn canvas charts, no libraries
   ───────────────────────────────────────────────────────────── */

const Chart = {

  COLOR: {
    principal: '#4ade80',
    interest:  '#f59e0b',
    grid:      '#262d38',
    text:      '#8b95a3'
  },

  /** Scale the canvas for retina screens and return a clean context. */
  ctxOf(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || canvas.width;
    const h = canvas.height / (canvas._scaled ? dpr : 1);

    if (!canvas._scaled || canvas._w !== w) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.height = h + 'px';
      canvas._scaled = true;
      canvas._w = w;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  },

  /** Principal vs interest, as a ring. */
  donut(canvas, principal, interest) {
    const { ctx, w, h } = this.ctxOf(canvas);
    const total = principal + interest;
    if (total <= 0) return;

    const cx = w / 2, cy = h / 2;
    const radius = Math.min(w, h) / 2 - 8;
    const thickness = radius * 0.42;
    let start = -Math.PI / 2;

    for (const [value, color] of [[principal, this.COLOR.principal], [interest, this.COLOR.interest]]) {
      const angle = (value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius - thickness / 2, start, start + angle);
      ctx.lineWidth = thickness;
      ctx.strokeStyle = color;
      ctx.stroke();
      start += angle;
    }

    ctx.fillStyle = this.COLOR.text;
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('interest', cx, cy - 6);
    ctx.fillStyle = this.COLOR.interest;
    ctx.font = '700 18px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(Math.round((interest / total) * 100) + '%', cx, cy + 14);
  },

  /** Outstanding balance over the life of the loan, as an area chart. */
  balance(canvas, yearlyRows, startingBalance) {
    const { ctx, w, h } = this.ctxOf(canvas);
    const pad = { l: 56, r: 14, t: 14, b: 26 };
    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;

    const points = [startingBalance, ...yearlyRows.map(r => r.balance)];
    const max = Math.max(...points, 1);
    const stepX = plotW / (points.length - 1 || 1);
    const x = i => pad.l + i * stepX;
    const y = v => pad.t + plotH - (v / max) * plotH;

    // horizontal grid + axis labels
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let g = 0; g <= 4; g++) {
      const value = (max / 4) * g;
      const gy = y(value);
      ctx.strokeStyle = this.COLOR.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.l, gy);
      ctx.lineTo(w - pad.r, gy);
      ctx.stroke();
      ctx.fillStyle = this.COLOR.text;
      ctx.fillText(this.short(value), pad.l - 8, gy);
    }

    // filled area
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + plotH);
    grad.addColorStop(0, 'rgba(74, 222, 128, .35)');
    grad.addColorStop(1, 'rgba(74, 222, 128, .02)');
    ctx.beginPath();
    ctx.moveTo(x(0), y(points[0]));
    points.forEach((v, i) => ctx.lineTo(x(i), y(v)));
    ctx.lineTo(x(points.length - 1), y(0));
    ctx.lineTo(x(0), y(0));
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // the line itself
    ctx.beginPath();
    points.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
    ctx.strokeStyle = this.COLOR.principal;
    ctx.lineWidth = 2;
    ctx.stroke();

    // year labels, thinned out on long loans
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = this.COLOR.text;
    const every = Math.ceil(points.length / 12);
    points.forEach((_, i) => {
      if (i % every === 0 || i === points.length - 1)
        ctx.fillText(i === 0 ? 'now' : 'Y' + i, x(i), pad.t + plotH + 8);
    });
  },

  /** 2500000 → "25L" / "2.5M" style short labels. */
  short(v) {
    if (v >= 1e7) return (v / 1e7).toFixed(1).replace(/\.0$/, '') + 'Cr';
    if (v >= 1e5) return (v / 1e5).toFixed(1).replace(/\.0$/, '') + 'L';
    if (v >= 1e3) return Math.round(v / 1e3) + 'K';
    return Math.round(v);
  }
};
