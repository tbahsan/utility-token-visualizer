/* Prepaid Meter Helper — 100% client-side. Author: tbahsan (https://github.com/tbahsan) */
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const store = {
  get(k, d) { try { const v = localStorage.getItem('upm.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('upm.' + k, JSON.stringify(v)); } catch {} }
};
const BN = '০১২৩৪৫৬৭৮৯';
const state = {
  lang: store.get('lang', 'bn'),
  num: store.get('num', 'bn'),
  theme: store.get('theme', 'auto'),
  provider: store.get('provider', 'DESCO'),
  phase: store.get('phase', 'single'),
  load: store.get('load', '২'),
};
let I18N = { bn: null, en: null };
let TARIFF = null;          // defaults block from tariffs.json
let TARIFF_META = null;     // {effective_date, last_verified}
let APPLIANCE_DEFAULTS = null;
let lastRechargeText = '';
const ERR_TARIFF = { bn: 'শুল্ক তথ্য (tariffs.json) লোড হয়নি — হোস্টেড লিংক বা লোকাল সার্ভার থেকে চালান।', en: 'Tariff data failed to load — use the hosted link or a local server.' };

/* ---------- numbers ---------- */
function parseNum(s) {
  if (typeof s === 'number') return s;
  s = String(s ?? '').replace(/[০-৯]/g, d => BN.indexOf(d)).replace(/[,\s৳]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
function toNum(s) {
  s = String(s);
  return state.num === 'bn' ? s.replace(/[0-9]/g, d => BN[d]) : s;
}
function fmt(n, dec = 2) {
  return toNum(Number(n).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }));
}
function fmtInt(n) { return toNum(Math.round(Number(n)).toLocaleString('en-US')); }
function tk(n) { return '৳' + fmt(n); }
function r2(n) { return Math.round(n * 100) / 100; }

/* ---------- i18n ---------- */
function t(k, v) {
  let s = (I18N[state.lang] && I18N[state.lang][k]) ?? I18N.bn?.[k] ?? I18N.en?.[k] ?? k;
  if (v) for (const x in v) s = s.split('{' + x + '}').join(v[x]);
  return s;
}
function applyI18n() {
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  $$('[data-num]').forEach(el => { el.textContent = toNum(el.dataset.num); });
  document.documentElement.lang = state.lang;
  $('#btn-bn').setAttribute('aria-pressed', state.lang === 'bn');
  $('#btn-en').setAttribute('aria-pressed', state.lang === 'en');
  renderFreshness();
  if (!$('#r-out').hidden) calcRecharge();
  if ($('#s-out').dataset.done === '1') calcSlab();
  updateTokenCount();
  if ($('#u-out').dataset.done === '1') calcUsage();
  renderLog(); renderAppliances();
}
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2300);
}

/* ---------- tariff math ---------- */
function slabLabel(s) { return s['label_' + state.lang] || s.label_bn; }
function slabCalc(u) {
  const d = TARIFF, rows = [];
  if (!d || !(u > 0)) return { rows, total: 0, avg: 0, label: '—' };
  if (d.lifeline_only_if_total_lte_50 && u <= 50) {
    const s = d.slabs[0], c = u * s.rate;
    rows.push({ label: slabLabel(s), units: u, rate: s.rate, cost: c });
    return { rows, total: c, avg: c / u, label: slabLabel(s) };
  }
  let prev = 0, total = 0, label = '—';
  for (const s of d.slabs) {
    if (s.lifeline) continue;
    const top = s.upto == null ? Infinity : s.upto;
    if (u <= prev) break;
    const q = Math.min(u, top) - prev, c = q * s.rate;
    rows.push({ label: slabLabel(s), units: q, rate: s.rate, cost: c });
    total += c;
    if (u <= top) label = slabLabel(s);
    prev = top;
  }
  return { rows, total, avg: total / u, label };
}
function marginalRateAt(total) {
  const d = TARIFF;
  if (d.lifeline_only_if_total_lte_50 && total < 50) return { rate: d.slabs[0].rate, next: 50, slab: d.slabs[0] };
  for (const s of d.slabs) {
    if (s.lifeline) continue;
    const top = s.upto == null ? Infinity : s.upto;
    if (total < top) return { rate: s.rate, next: top, slab: s };
  }
  const s = d.slabs[d.slabs.length - 1];
  return { rate: s.rate, next: Infinity, slab: s };
}
function kwhFromCredit(E, used) {
  if (!(E > 0)) return { kwh: 0, label: slabCalc(Math.max(used, 0.01)).label };
  let total = Math.max(used, 0), kwh = 0, rem = E, guard = 0, slab = null;
  while (rem > 0.005 && guard++ < 30) {
    const m = marginalRateAt(total);
    slab = m.slab;
    const room = m.next === Infinity ? Infinity : m.next - total;
    const take = Math.min(room, rem / m.rate);
    if (!(take > 1e-9)) break;
    kwh += take; total += take; rem -= take * m.rate;
  }
  return { kwh, label: slab ? slabLabel(slab) : '—' };
}
function tariffCfg() {
  const d = TARIFF;
  return {
    rent: state.phase === 'three' ? d.meter_rent.three_phase : d.meter_rent.single_phase,
    perKw: d.demand_charge_per_kw,
  };
}

/* ---------- recharge ---------- */
function calcRecharge() {
  if (!TARIFF) { toast(ERR_TARIFF[state.lang]); return; }
  const G = parseNum($('#r-gross').value);
  if (!(G > 0)) { toast(t('rech.empty')); return; }
  let dues = Math.min(Math.max(parseNum($('#r-dues').value), 0), G);
  const used = Math.max(parseNum($('#r-used').value), 0);
  const load = Math.max(parseNum(state.load), 0);
  const { rent, perKw } = tariffCfg();
  const dem = perKw * load;
  const base = G - dues;
  const netPreVAT = base / 1.05;
  const vat = base - netPreVAT;
  const reb = 0.005 * netPreVAT;
  const energy = netPreVAT - rent - dem + reb;
  const { kwh, label } = kwhFromCredit(energy, used);

  $('#r-empty').hidden = true;
  $('#r-out').hidden = false;
  const rows = [
    [t('dyn.gross'), G, ''],
    ...(dues > 0 ? [[t('dyn.dues'), -dues, '']] : []),
    [t('dyn.rent'), -rent, ''],
    [`${t('dyn.demand')} (${toNum(load)} kW)`, -dem, ''],
    [t('dyn.vat'), -vat, ''],
    [t('dyn.rebate'), reb, ''],
    [t('dyn.energy'), energy, 'total'],
  ];
  $('#r-table').innerHTML = rows.map(([l, v, c]) =>
    `<tr class="${c}"><td>${l}</td><td class="num">${v < 0 ? '−' : ''}${tk(Math.abs(v))}</td></tr>`).join('');
  // stacked bar
  const segs = [
    ...(dues > 0 ? [[dues, '#616161', t('dyn.dues')]] : []),
    [rent, '#ef6c00', t('dyn.rent')],
    [dem, '#ab47bc', t('dyn.demand')],
    [vat, '#d32f2f', t('dyn.vat')],
    [Math.max(energy, 0), '#0b6b3a', t('dyn.energy')],
  ];
  $('#r-bar').innerHTML = segs.map(([v, c]) =>
    `<div style="width:${(v / G * 100).toFixed(1)}%;background:${c}" title="${tk(v)}"></div>`).join('');
  $('#r-legend').innerHTML = segs.map(([, c, l]) => `<span><i style="background:${c}"></i>${l}</span>`).join('');
  const explain = t('dyn.explain', { gross: fmt(G), rent: fmt(rent), dem: fmt(dem), vat: fmt(vat), reb: fmt(reb), energy: fmt(Math.max(energy, 0)) });
  const kwhLine = energy < 0
    ? t('dyn.warn_fixed')
    : t('dyn.kwh_line', { kwh: fmt(kwh, 1), slab: label });
  $('#r-explain').textContent = explain;
  $('#r-kwh').textContent = kwhLine;
  lastRechargeText = `${explain} ${kwhLine}`;
}
function speakLast() {
  if (!('speechSynthesis' in window) || !lastRechargeText) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(lastRechargeText);
  u.lang = state.lang === 'bn' ? 'bn-BD' : 'en-US';
  u.rate = 0.95;
  speechSynthesis.speak(u);
}
async function copyText(s) {
  try { await navigator.clipboard.writeText(s); toast(t('dyn.copied')); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = s; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(t('dyn.copied')); } catch { toast(s); }
    ta.remove();
  }
}

/* ---------- slab ---------- */
function calcSlab() {
  if (!TARIFF) { toast(ERR_TARIFF[state.lang]); return; }
  const u = parseNum($('#s-units').value);
  if (!(u > 0)) { toast(t('slab.empty')); return; }
  const r = slabCalc(u);
  $('#s-out').dataset.done = '1';
  $('#s-out').innerHTML =
    `<table class="tbl"><tr><th>${t('dyn.slab_range')}</th><th class="num">${t('dyn.slab_units')}</th><th class="num">${t('dyn.slab_rate')}</th><th class="num">${t('dyn.slab_cost')}</th></tr>` +
    r.rows.map(x => `<tr><td>${x.label}</td><td class="num">${fmt(x.units, 1)}</td><td class="num">${fmt(x.rate)}</td><td class="num">${tk(x.cost)}</td></tr>`).join('') +
    `<tr class="total"><td>${t('dyn.slab_total')}</td><td class="num">${fmt(u, 1)}</td><td class="num">${t('dyn.slab_avg')} ${fmt(r.avg)}</td><td class="num">${tk(r.total)}</td></tr></table>`;
}

/* ---------- token ---------- */
function tokenDigits() { return $('#t-in').value.replace(/\D/g, '').slice(0, 20); }
function paintToken() {
  const d = tokenDigits();
  $('#t-in').value = (d.match(/.{1,4}/g) || []).join('-');
  $('#t-chunks').innerHTML = (d.match(/.{1,4}/g) || []).map(c => `<b>${c}</b>`).join('');
  updateTokenCount();
  $('#t-msg').textContent = '';
  $('#t-msg').className = 'msg';
}
function updateTokenCount() {
  const n = tokenDigits().length;
  const el = $('#t-count');
  if (el) el.textContent = toNum(n);
}
function checkToken() {
  const n = tokenDigits().length;
  const m = $('#t-msg');
  if (n === 0) { m.textContent = t('dyn.tok_empty'); m.className = 'msg err'; return; }
  if (n === 20) { m.textContent = t('dyn.tok_ok'); m.className = 'msg ok'; }
  else { m.textContent = t('dyn.tok_bad', { n: toNum(n) }); m.className = 'msg err'; }
}

/* ---------- usage ---------- */
function calcUsage() {
  if (!TARIFF) { toast(ERR_TARIFF[state.lang]); return; }
  const s = parseNum($('#u-start').value), n = parseNum($('#u-now').value);
  const day = Math.round(parseNum($('#u-day').value)), bal = parseNum($('#u-bal').value);
  if (!(n >= s) || !(day >= 1 && day <= 31)) { toast(t('dyn.use_fill')); return; }
  const now = new Date();
  const monthLen = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const used = n - s, daily = used / day, proj = daily * monthLen;
  const sc = slabCalc(proj);
  const dailyCost = daily * (sc.avg || 0);
  const daysLeft = dailyCost > 0 ? bal / dailyCost : Infinity;
  $('#u-out').dataset.done = '1';
  $('#u-out').innerHTML =
    `<p>${t('dyn.use_daily')}: <b>${fmt(daily, 1)} kWh</b></p>` +
    `<p>${t('dyn.use_proj')}: <b>${fmt(proj, 0)} kWh</b></p>` +
    `<p>${t('dyn.use_slab')}: <b>${sc.label}</b></p>` +
    `<p>${isFinite(daysLeft) ? t('dyn.use_days', { d: toNum(Math.floor(daysLeft)) }) : t('dyn.use_days_inf')}</p>` +
    `<p class="hint">${t('dyn.use_note')}</p>`;
}
function getLog() { return store.get('log', []); }
function renderLog() {
  const log = getLog().slice().sort((a, b) => a.d < b.d ? 1 : -1);
  $('#u-table').innerHTML = log.length
    ? `<tr><th>${t('dyn.log_date')}</th><th class="num">${t('dyn.log_kwh')}</th><th></th></tr>` +
      log.map((r, i) => `<tr><td>${toNum(r.d)}</td><td class="num">${fmt(r.kwh, 1)}</td><td class="num"><button data-del="${r.d}|${r.kwh}" aria-label="${t('dyn.log_del')}">×</button></td></tr>`).join('')
    : `<tr><td colspan="3" class="empty">${t('dyn.log_empty')}</td></tr>`;
  $$('#u-table [data-del]').forEach(b => b.onclick = () => {
    const [d, k] = b.dataset.del.split('|');
    store.set('log', getLog().filter(r => !(r.d === d && String(r.kwh) === k)));
    renderLog();
  });
}

/* ---------- appliances ---------- */
function defaultAppliances() {
  if (APPLIANCE_DEFAULTS) return APPLIANCE_DEFAULTS.map(a => ({ bn: a.name_bn, en: a.name_en, w: a.watt, h: a.hours, q: a.qty }));
  return [
    { bn: 'সিলিং ফ্যান', en: 'Ceiling fan', w: 75, h: 12, q: 2 },
    { bn: 'এলইডি বাল্ব', en: 'LED bulb', w: 12, h: 6, q: 5 },
    { bn: 'ফ্রিজ (মাঝারি)', en: 'Fridge', w: 150, h: 8, q: 1 },
    { bn: 'এসি (১.৫ টন)', en: 'AC (1.5 ton)', w: 1500, h: 6, q: 1 },
  ];
}
function getAppliances() {
  const s = store.get('appliances', null);
  return s || defaultAppliances();
}
function avgRate() {
  const u = parseNum($('#a-usage').value);
  if (!TARIFF || !(u > 0)) return 0;
  return slabCalc(u).avg || 0;
}
function renderAppliances() {
  const rows = getAppliances(), rate = avgRate();
  const tb = $('#a-table');
  tb.innerHTML = `<tr><th>${t('dyn.ap_name')}</th><th class="num">${t('dyn.ap_watt')}</th><th class="num">${t('dyn.ap_hrs')}</th><th class="num">${t('dyn.ap_qty')}</th><th class="num">${t('dyn.ap_kwh')}</th><th class="num">${t('dyn.ap_cost')}</th><th></th></tr>` +
    rows.map((r, i) => {
      const kwh = r.w * r.h * r.q * 30 / 1000;
      return `<tr><td><input data-ar="${i}|n" value="${String(r[state.lang] ?? r.bn).replace(/"/g, '&quot;')}"></td>` +
        `<td><input data-ar="${i}|w" type="text" inputmode="decimal" value="${toNum(r.w)}"></td>` +
        `<td><input data-ar="${i}|h" type="text" inputmode="decimal" value="${toNum(r.h)}"></td>` +
        `<td><input data-ar="${i}|q" type="text" inputmode="numeric" value="${toNum(r.q)}"></td>` +
        `<td class="num">${fmt(kwh, 1)}</td><td class="num">${tk(kwh * rate)}</td>` +
        `<td><button data-adel="${i}" aria-label="×">×</button></td></tr>`;
    }).join('');
  $$('#a-table [data-ar]').forEach(inp => inp.onchange = () => {
    const [i, f] = inp.dataset.ar.split('|');
    const rs = getAppliances();
    if (f === 'n') { rs[+i][state.lang] = inp.value; if (state.lang === 'bn') rs[+i].en = rs[+i].en || inp.value; else rs[+i].bn = rs[+i].bn || inp.value; }
    else rs[+i][f] = Math.max(parseNum(inp.value), 0);
    store.set('appliances', rs);
    renderAppliances();
  });
  $$('#a-table [data-adel]').forEach(b => b.onclick = () => {
    const rs = getAppliances(); rs.splice(+b.dataset.adel, 1);
    store.set('appliances', rs); renderAppliances();
  });
  const tot = rows.reduce((s, r) => s + r.w * r.h * r.q * 30 / 1000, 0);
  $('#a-total').textContent = t('dyn.ap_total', { kwh: fmt(tot, 0), tk: fmt(tot * rate, 0) });
  paintAC(rate);
}
function paintAC(rate) {
  const h = parseFloat($('#a-ac').value);
  $('#a-ac-v').textContent = toNum(h);
  const kwh = 1500 * h * 30 / 1000;
  $('#a-save').textContent = t('dyn.ap_save', { h: toNum(h), tk: fmt(kwh * (rate || 0), 0), kwh: fmt(kwh, 0) });
}

/* ---------- freshness ---------- */
function renderFreshness() {
  if (!TARIFF_META) return;
  const el = $('#fresh');
  el.textContent = t('dyn.fresh', { eff: toNum(TARIFF_META.effective_date), ver: toNum(TARIFF_META.last_verified) });
  const age = (Date.now() - new Date(TARIFF_META.last_verified).getTime()) / 864e5;
  if (age > 180) el.textContent += ' • ' + t('dyn.stale');
}

/* ---------- wiring ---------- */
function setTheme(th) {
  state.theme = th; store.set('theme', th);
  document.documentElement.dataset.theme = th;
  $('#btn-theme').textContent = th === 'light' ? '☀' : th === 'dark' ? '☾' : '◐';
}
document.addEventListener('DOMContentLoaded', async () => {
  // restore prefs
  $('#in-provider').value = state.provider;
  $('#in-load').value = state.load;
  document.documentElement.dataset.theme = state.theme;
  setTheme(state.theme);
  $('#btn-num').textContent = state.num === 'bn' ? '১২৩' : '123';
  const today = new Date();
  $('#u-day').value = toNum(today.getDate());
  $('#u-date').value = today.toISOString().slice(0, 10);
  if (!('speechSynthesis' in window)) $('#r-speak').style.display = 'none';

  // tabs
  $$('[role=tab]').forEach(btn => btn.onclick = () => {
    $$('[role=tab]').forEach(b => b.setAttribute('aria-selected', b === btn ? 'true' : 'false'));
    $$('.tab-panel').forEach(p => {
      const on = p.id === 'tab-' + btn.dataset.tab;
      p.hidden = !on;
      p.classList.toggle('active', on);
    });
  });
  // provider bar
  const phasePaint = () => {
    $('#ph-single').classList.toggle('on', state.phase === 'single');
    $('#ph-three').classList.toggle('on', state.phase === 'three');
    $('#ph-single').setAttribute('aria-pressed', state.phase === 'single');
    $('#ph-three').setAttribute('aria-pressed', state.phase === 'three');
  };
  phasePaint();
  $('#in-provider').onchange = e => { state.provider = e.target.value; store.set('provider', state.provider); if (!$('#r-out').hidden) calcRecharge(); };
  $('#ph-single').onclick = () => { state.phase = 'single'; store.set('phase', 'single'); phasePaint(); if (!$('#r-out').hidden) calcRecharge(); };
  $('#ph-three').onclick = () => { state.phase = 'three'; store.set('phase', 'three'); phasePaint(); if (!$('#r-out').hidden) calcRecharge(); };
  $('#in-load').onchange = e => { state.load = e.target.value; store.set('load', state.load); if (!$('#r-out').hidden) calcRecharge(); };
  // controls
  $('#btn-bn').onclick = () => { state.lang = 'bn'; store.set('lang', 'bn'); applyI18n(); };
  $('#btn-en').onclick = () => {
    if (!I18N.en) { toast(t('dyn.en_fail')); return; }
    state.lang = 'en'; store.set('lang', 'en'); applyI18n();
  };
  $('#btn-num').onclick = () => {
    state.num = state.num === 'bn' ? 'en' : 'bn'; store.set('num', state.num);
    $('#btn-num').textContent = state.num === 'bn' ? '১২৩' : '123';
    applyI18n();
  };
  $('#btn-theme').onclick = () => setTheme(state.theme === 'auto' ? 'light' : state.theme === 'light' ? 'dark' : 'auto');
  // recharge
  $('#r-go').onclick = calcRecharge;
  ['#r-gross', '#r-dues', '#r-used'].forEach(s => $(s).addEventListener('keydown', e => { if (e.key === 'Enter') calcRecharge(); }));
  $('#r-speak').onclick = speakLast;
  $('#r-copy').onclick = () => lastRechargeText && copyText(lastRechargeText);
  $('#r-share').onclick = async () => {
    if (!lastRechargeText) return;
    if (navigator.share) { try { await navigator.share({ text: lastRechargeText }); } catch {} }
    else copyText(lastRechargeText);
  };
  $('#r-print').onclick = () => window.print();
  // slab
  $('#s-go').onclick = calcSlab;
  $('#s-units').addEventListener('keydown', e => { if (e.key === 'Enter') calcSlab(); });
  // token
  $('#t-in').addEventListener('input', paintToken);
  $('#t-check').onclick = checkToken;
  $('#t-copy').onclick = () => { const v = $('#t-in').value; v ? copyText(v) : toast(t('dyn.tok_empty')); };
  $('#t-clear').onclick = () => { $('#t-in').value = ''; paintToken(); };
  // usage
  $('#u-go').onclick = calcUsage;
  $('#u-add').onclick = () => {
    const d = $('#u-date').value, kwh = parseNum($('#u-kwh').value);
    if (!d || !(kwh > 0)) { toast(t('dyn.log_bad')); return; }
    const log = getLog(); log.push({ d, kwh }); store.set('log', log);
    $('#u-kwh').value = ''; renderLog(); toast(t('dyn.log_added'));
  };
  $('#u-export').onclick = () => {
    const log = getLog();
    const csv = 'date,kwh\n' + log.map(r => `${r.d},${r.kwh}`).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'meter-log.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  $('#u-wipe').onclick = () => { store.set('log', []); renderLog(); toast(t('dyn.log_wiped')); };
  // appliances
  $('#a-add').onclick = () => {
    const rs = getAppliances();
    const nm = t('dyn.ap_new');
    rs.push({ bn: nm, en: nm, w: 100, h: 1, q: 1 });
    store.set('appliances', rs); renderAppliances();
  };
  $('#a-reset').onclick = () => { store.set('appliances', defaultAppliances()); renderAppliances(); };
  $('#a-usage').onchange = renderAppliances;
  $('#a-ac').oninput = () => paintAC(avgRate());

  // load data
  const [bn, en, tf, ap] = await Promise.allSettled([
    fetch('i18n/bn.json').then(r => r.json()),
    fetch('i18n/en.json').then(r => r.json()),
    fetch('tariffs/tariffs.json').then(r => r.json()),
    fetch('data/appliances.json').then(r => r.json()),
  ]);
  if (bn.status === 'fulfilled') I18N.bn = bn.value;
  if (en.status === 'fulfilled') I18N.en = en.value;
  if (tf.status === 'fulfilled') {
    TARIFF = tf.value.defaults;
    TARIFF_META = { effective_date: tf.value.defaults.effective_date, last_verified: tf.value.last_verified };
  } else {
    $('#r-empty').textContent = ERR_TARIFF[state.lang];
  }
  if (ap.status === 'fulfilled' && ap.value.items) APPLIANCE_DEFAULTS = ap.value.items;
  applyI18n();
  renderLog(); renderAppliances();

  // service worker (http/https only)
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    try { await navigator.serviceWorker.register('sw.js'); } catch {}
  }
});
