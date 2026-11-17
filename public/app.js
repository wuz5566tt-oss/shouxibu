/* 收息簿 前端 */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const KEY = 'shouxibu.v1';
const KIND = { stock: '個股', etf: 'ETF', fund: '基金' };
const UNIT = { stock: '股', etf: '份', fund: '份' };
const METRICS = {
  yield: '股價息率', costYield: '成本息率', price: '現價', pct: '漲跌幅', pnl: '浮動盈虧',
  pnlRate: '盈虧率', totalCost: '總成本', received: '累計收息', weight: '持倉佔比',
};
const DEF = () => ({
  holdings: [], records: [], watch: [],
  bills: [{ id: uid(), name: '房租', amount: 3000 }, { id: uid(), name: '水電燃氣', amount: 400 }, { id: uid(), name: '手機與網路', amount: 150 }, { id: uid(), name: '交通', amount: 500 }, { id: uid(), name: '餐飲', amount: 2500 }],
  metrics: ['yield', 'costYield', 'pct', 'pnl'], tab: 'stock',
  proj: { monthly: 3000, years: 15, reinvest: 100, growth: 0, yld: null },
});
function uid() { return Math.random().toString(36).slice(2, 10); }
function load() { try { return Object.assign(DEF(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch { return DEF(); } }
function save() { localStorage.setItem(KEY, JSON.stringify(S)); }
let S = load();
let Q = {}; try { Q = JSON.parse(localStorage.getItem(KEY + '.q')) || {}; } catch {}
let lastAt = localStorage.getItem(KEY + '.at') || null;
let view = 'home', loading = false;
let cal = { y: new Date().getFullYear(), m: new Date().getMonth(), sel: null, year: new Date().getFullYear() };

/* ---------- 圖示 ---------- */
const I = {
  hold: '<path d="M3 7.5 12 3l9 4.5-9 4.5z"/><path d="m3 12 9 4.5 9-4.5"/><path d="m3 16.5 9 4.5 9-4.5"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/><circle cx="12" cy="15" r="1.6"/>',
  find: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z"/>',
  me: '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c1.4-3.6 4.2-5.4 7.5-5.4s6.1 1.8 7.5 5.4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.4L4 8"/><path d="M4 3.5V8h4.5"/><path d="M4 13a8 8 0 0 0 14.6 4.4L20 16"/><path d="M20 20.5V16h-4.5"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  chevL: '<path d="m15 5-7 7 7 7"/>', chevR: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', up: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><path d="M9 8.5h6M12 8.5V17M8.5 12.5h7"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  db: '<ellipse cx="12" cy="6" rx="7.5" ry="2.8"/><path d="M4.5 6v12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.5V20h12V9.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  sample: '<path d="M9 3h6M10 3v5.5L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9.5V3"/><path d="M7.5 14h9"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
};
const ic = (n, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}" stroke-linecap="round" stroke-linejoin="round">${I[n]}</svg>`;

/* ---------- 格式 ---------- */
const NA = '<span style="font-family:var(--sans);font-size:11px;color:var(--mute)">暫無資料</span>';
const isN = (v) => typeof v === 'number' && Number.isFinite(v);
function money(v, d = 2) {
  if (!isN(v)) return NA;
  const a = Math.abs(v);
  if (a >= 1e8) return (v / 1e8).toFixed(2) + '億';
  if (a >= 1e5) return (v / 1e4).toFixed(2) + '萬';
  return v.toLocaleString('zh-TW', { minimumFractionDigits: d, maximumFractionDigits: d });
}
const pct = (v, d = 2, sign = false) => (isN(v) ? (sign && v > 0 ? '+' : '') + v.toFixed(d) + '%' : NA);
const cls = (v) => (isN(v) ? (v > 0 ? 'up' : v < 0 ? 'down' : '') : '');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/* ---------- 計算 ---------- */
function calc() {
  const rows = S.holdings.map((h) => {
    const q = Q[h.sym] || {};
    const price = isN(q.price) ? q.price : null;
    const mv = price != null ? price * h.shares : null;
    const cost = h.cost * h.shares;
    const ttm = isN(q.ttmDps) && q.divSource ? q.ttmDps : null;
    const annual = ttm != null ? ttm * h.shares : null;
    const received = S.records.filter((r) => r.sym === h.sym).reduce((a, r) => a + r.amount, 0);
    return {
      h, q, price, mv, cost, ttm, annual, received,
      yield: price && ttm != null ? (ttm / price) * 100 : null,
      costYield: h.cost > 0 && ttm != null ? (ttm / h.cost) * 100 : null,
      pnl: mv != null ? mv - cost : null,
      pnlRate: mv != null && cost > 0 ? (mv / cost - 1) * 100 : null,
      pct: isN(q.pct) ? q.pct : null,
    };
  });
  const mv = rows.reduce((a, r) => a + (r.mv ?? r.cost), 0);
  rows.forEach((r) => (r.weight = mv > 0 ? ((r.mv ?? r.cost) / mv) * 100 : null));
  const cost = rows.reduce((a, r) => a + r.cost, 0);
  const annual = rows.reduce((a, r) => a + (r.annual || 0), 0);
  const pnl = rows.reduce((a, r) => a + (r.pnl || 0), 0);
  const received = S.records.reduce((a, r) => a + r.amount, 0);
  const tiers = [0, 0, 0, 0];
  rows.forEach((r) => { const v = r.mv ?? r.cost; const y = r.yield; if (y == null || y === 0) tiers[3] += v; else if (y >= 5) tiers[0] += v; else if (y >= 3) tiers[1] += v; else tiers[2] += v; });
  return { rows, mv, cost, annual, pnl, received, yield: mv > 0 ? (annual / mv) * 100 : null, costYield: cost > 0 ? (annual / cost) * 100 : null, tiers };
}

/* ---------- 資料 ---------- */
async function refresh(silent) {
  const syms = new Map();
  S.holdings.forEach((h) => syms.set(h.sym, h.kind));
  S.watch.forEach((w) => syms.set(w.sym, w.kind));
  if (!syms.size) return;
  loading = true; if (!silent) render();
  try {
    const items = [...syms].map(([s, k]) => s + ':' + k).join(',');
    const r = await fetch('/api/batch?items=' + items).then((r) => r.json());
    Object.assign(Q, r.data || {});
    lastAt = new Date().toLocaleString('zh-TW', { hour12: false });
    localStorage.setItem(KEY + '.q', JSON.stringify(Q)); localStorage.setItem(KEY + '.at', lastAt);
  } catch { toast('連線失敗，顯示上次資料'); }
  loading = false; render();
}
async function info(q, kind) { return fetch('/api/info?q=' + encodeURIComponent(q) + (kind ? '&kind=' + kind : '')).then((r) => r.json()); }

/* ---------- 共用 ---------- */
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2200); }
function openSheet(html, onMount) { $('#sheetBody').innerHTML = '<div class="grab"></div>' + html; $('#sheet').classList.add('open'); onMount && onMount($('#sheetBody')); }
function closeSheet() { $('#sheet').classList.remove('open'); }
$('#sheet').addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeSheet(); });
const hdr = (title, sub, right = '') => `<div class="top"><div class="brand"><div class="mark"><svg viewBox="0 0 64 64" width="22" height="22"><defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1dfb2"/><stop offset="1" stop-color="#a8864a"/></linearGradient></defs><circle cx="32" cy="32" r="20" fill="none" stroke="url(#gg)" stroke-width="3"/><path d="M21 36c4 5 18 5 22 0M32 15v34" stroke="url(#gg)" stroke-width="3" fill="none" stroke-linecap="round"/></svg></div><div><b>${title}</b><small>${sub}</small></div></div><div style="display:flex;gap:8px">${right}</div></div>`;
const disclaimer = `<div class="disclaimer"><b>風險提醒</b><br>本工具資料取自公開行情與分紅公告，可能延遲或有誤，股息率以近十二個月稅前現金分紅計算，過往分紅不代表未來。所有數字僅供參考，不構成投資建議。</div>`;

/* ---------- 持倉 ---------- */
function vHome() {
  const c = calc();
  const list = c.rows.filter((r) => r.h.kind === S.tab);
  const cnt = (k) => S.holdings.filter((h) => h.kind === k).length;
  const t = c.tiers, tt = t.reduce((a, b) => a + b, 0) || 1;
  const hero = `<section class="card hero">
    <svg class="ring" viewBox="0 0 200 200"><defs><linearGradient id="rg" x1="0" x2="1"><stop offset="0" stop-color="#f0deb0" stop-opacity=".5"/><stop offset="1" stop-color="#a6844a" stop-opacity="0"/></linearGradient></defs><circle cx="100" cy="100" r="80" fill="none" stroke="url(#rg)"/><circle cx="100" cy="100" r="60" fill="none" stroke="url(#rg)"/><circle cx="100" cy="100" r="40" fill="none" stroke="url(#rg)"/></svg>
    <div class="label">年度分紅測算（稅前）</div>
    <div class="big n"><span class="cur">¥</span>${S.holdings.length ? money(c.annual) : '0.00'}</div>
    <div class="hero-sub"><span class="pill">組合息率 <b class="n">${pct(c.yield)}</b></span><span>月均 <b class="n" style="color:var(--text)">¥${money(c.annual / 12)}</b></span></div>
    <div class="grid3">
      <div class="kv"><div class="k">總市值</div><div class="v n">${money(c.mv)}</div></div>
      <div class="kv"><div class="k">浮動盈虧</div><div class="v n ${cls(c.pnl)}">${S.holdings.length ? (c.pnl > 0 ? '+' : '') + money(c.pnl) : '0.00'}</div></div>
      <div class="kv"><div class="k">累計收息</div><div class="v n" style="color:var(--gold2)">${money(c.received)}</div></div>
    </div></section>`;
  const cards = list.map((r) => holdCard(r)).join('');
  const empty = `<div class="card empty">${ic('coin')}<div style="font-family:var(--serif);font-size:16px;color:var(--text);letter-spacing:.1em">尚無${KIND[S.tab]}持倉</div><p>輸入代號或名稱，自動帶出現價、<br>近十二個月分紅與股息率</p><button class="btn" data-act="add">${ic('plus')}新增持倉</button>${S.holdings.length ? '' : '<div style="margin-top:12px"><button class="btn ghost" data-act="sample">載入範例持倉</button></div>'}</div>`;
  const summary = S.holdings.length ? `<div class="sect"><h3>組合總覽</h3></div>
    <section class="card gold">
      <div style="display:flex;justify-content:space-between"><div class="kv"><div class="k">總資產</div><div class="n" style="font-size:24px;margin-top:4px">¥${money(c.mv)}</div></div>
      <div class="kv" style="text-align:right"><div class="k">綜合股息率</div><div class="n" style="font-size:24px;margin-top:4px;color:var(--gold2)">${pct(c.yield)}</div></div></div>
      <div class="label" style="margin-top:18px">股息率分層（按市值）</div>
      <div class="tierbar">${['t1', 't2', 't3', 't4'].map((k, i) => `<i class="${k}" style="width:${(t[i] / tt) * 100}%"></i>`).join('')}</div>
      <div class="legend">${['高息 ≥5%', '中息 3–5%', '低息 <3%', '不分紅'].map((n, i) => `<span><i class="dot t${i + 1}"></i>${n}<b>${((t[i] / tt) * 100).toFixed(1)}%</b></span>`).join('')}</div>
      <div class="label" style="margin-top:20px">投入與已收分紅</div>
      ${barPair('總投入', c.cost, c.cost, 't3')}${barPair('已收分紅', c.received, c.cost, 't1')}
      <div style="font-size:12px;color:var(--sub);margin-top:8px">分紅回本進度 <b class="n" style="color:var(--gold2)">${pct(c.cost ? (c.received / c.cost) * 100 : 0)}</b>　成本息率 <b class="n" style="color:var(--text)">${pct(c.costYield)}</b></div>
    </section>` : '';
  return `<div class="view">${hdr('收息簿', '股 息 · 複 利 · 時 間', `<button class="iconbtn" data-act="metrics" aria-label="顯示欄位">${ic('sliders')}</button><button class="iconbtn" data-act="refresh" aria-label="更新">${ic('refresh')}</button>`)}
    ${hero}
    <div class="seg">${Object.keys(KIND).map((k) => `<button class="${S.tab === k ? 'on' : ''}" data-tab="${k}">${KIND[k]}<sup>${cnt(k)}</sup></button>`).join('')}</div>
    <div class="stagger">${list.length ? cards : empty}</div>
    ${summary}
    <div class="src">${lastAt ? '更新於 ' + esc(lastAt) : ''}${loading ? '　更新中…' : ''}</div>
    ${disclaimer}
  </div><button class="fab" data-act="add" aria-label="新增">${ic('plus')}</button>`;
}
function barPair(n, v, max, k) {
  return `<div style="display:flex;align-items:center;gap:10px;margin-top:10px;font-size:12px;color:var(--sub)"><span style="width:56px">${n}</span><div style="flex:1;height:8px;border-radius:9px;background:rgba(255,255,255,.05);overflow:hidden"><i class="${k}" style="display:block;height:100%;width:${max ? Math.min(100, (v / max) * 100) : 0}%;border-radius:9px"></i></div><b class="n" style="width:78px;text-align:right;color:var(--text);font-weight:500">${money(v)}</b></div>`;
}
function metricVal(r, k) {
  const L = loading && !r.q.price;
  if (L) return '<span class="skel"></span>';
  switch (k) {
    case 'yield': return `<span class="gold">${r.q.divSource && r.ttm === 0 ? '不分紅' : pct(r.yield)}</span>`;
    case 'costYield': return r.q.divSource && r.ttm === 0 ? '0.00%' : pct(r.costYield);
    case 'price': return isN(r.price) ? r.price.toFixed(3) : NA;
    case 'pct': return `<span class="${cls(r.pct)}">${pct(r.pct, 2, true)}</span>`;
    case 'pnl': return `<span class="${cls(r.pnl)}">${isN(r.pnl) ? (r.pnl > 0 ? '+' : '') + money(r.pnl) : NA}</span>`;
    case 'pnlRate': return `<span class="${cls(r.pnlRate)}">${pct(r.pnlRate, 2, true)}</span>`;
    case 'totalCost': return money(r.cost);
    case 'received': return `<span class="gold">${money(r.received)}</span>`;
    case 'weight': return pct(r.weight, 1);
  }
}
function holdCard(r) {
  const { h, q } = r;
  const up = (q.upcoming || []).find((u) => u.perShare);
  return `<article class="card hold" data-open="${h.id}">
    <div class="head"><div><div class="nm">${esc(q.name || h.name)}</div><div class="cd">${h.code}<span class="tag">${KIND[h.kind]}</span>${q.errors?.length ? '<span class="tag warn">部分暫無資料</span>' : ''}</div></div>
    <div class="price"><div class="p n">${isN(r.price) ? r.price.toFixed(3) : loading ? '<span class="skel"></span>' : NA}</div><div class="c ${cls(r.pct)}">${isN(r.pct) ? pct(r.pct, 2, true) : ''}</div></div></div>
    <div class="metrics">${S.metrics.map((k) => `<div class="m"><div class="k">${METRICS[k]}</div><div class="v n">${metricVal(r, k)}</div></div>`).join('')}</div>
    <div class="foot"><span>持倉<b>${h.shares.toLocaleString()}</b> ${UNIT[h.kind]}</span><span>市值<b>${money(r.mv)}</b></span><span>成本<b>${h.cost.toFixed(3)}</b></span></div>
    ${up ? `<div class="notice">${ic('bell')}${up.ex ? '即將除息 ' + up.ex : '分紅預案 ' + esc(up.status)}　每${UNIT[h.kind]} ${up.perShare.toFixed(4)} 元　預估 ¥${money(up.perShare * h.shares)}</div>` : ''}
  </article>`;
}

/* 新增／編輯 持倉 */
function sheetHolding(h) {
  const edit = !!h;
  let pick = h ? { sym: h.sym, code: h.code, name: h.name, kind: h.kind } : null;
  openSheet(`<h2>${edit ? '編輯持倉' : '新增持倉'}</h2><div class="desc">輸入代號或名稱，例如 601398、515080、紅利</div>
    <div class="field"><label>代號／名稱</label><input class="input" id="fq" placeholder="輸入代號或名稱" autocomplete="off" value="${edit ? esc(h.code) : ''}" ${edit ? 'disabled' : ''}></div>
    <div class="results" id="fr" style="display:none"></div>
    <div id="fp"></div>
    <div class="two"><div class="field"><label>持倉數量</label><input class="input n" id="fs" type="number" inputmode="decimal" placeholder="0" value="${edit ? h.shares : ''}"></div>
    <div class="field"><label>成本價（元）</label><input class="input n" id="fc" type="number" inputmode="decimal" step="0.001" placeholder="0.000" value="${edit ? h.cost : ''}"></div></div>
    <button class="btn block" id="fok">${edit ? '儲存' : '加入持倉'}</button>`, (el) => {
    const fq = $('#fq', el), fr = $('#fr', el), fp = $('#fp', el);
    let tm;
    const showInfo = async (p) => {
      pick = p; fr.style.display = 'none'; fq.value = p.code + ' ' + (p.name || '');
      fp.innerHTML = `<div class="preview"><span class="skel" style="width:120px"></span></div>`;
      const d = await info(p.sym, p.kind);
      if (!d.ok) { fp.innerHTML = `<div class="preview">${NA}</div>`; return; }
      Q[d.sym] = d; pick = { sym: d.sym, code: d.code, name: d.name, kind: d.kind };
      fp.innerHTML = previewHtml(d);
      if (!$('#fc', el).value && isN(d.price)) $('#fc', el).value = d.price;
    };
    if (edit) fp.innerHTML = Q[h.sym] ? previewHtml({ ...Q[h.sym], code: h.code, kind: h.kind }) : '';
    fq.addEventListener('input', () => {
      clearTimeout(tm); const v = fq.value.trim(); if (!v) { fr.style.display = 'none'; return; }
      tm = setTimeout(async () => {
        const r = await fetch('/api/search?q=' + encodeURIComponent(v)).then((r) => r.json()).catch(() => ({ list: [] }));
        fr.innerHTML = r.list.length ? r.list.map((x, i) => `<button data-i="${i}"><span>${esc(x.name)}<span class="cd n" style="color:var(--mute);margin-left:8px">${x.code}</span></span><span class="tag">${KIND[x.kind]}</span></button>`).join('') : `<button disabled><span style="color:var(--mute)">${r.ok === false ? '搜尋服務暫無回應' : '查無結果'}</span></button>`;
        fr.style.display = 'block';
        $$('button[data-i]', fr).forEach((b) => b.onclick = () => showInfo(r.list[+b.dataset.i]));
      }, 280);
    });
    $('#fok', el).onclick = () => {
      const shares = parseFloat($('#fs', el).value), cost = parseFloat($('#fc', el).value);
      if (!pick) return toast('請先選擇標的');
      if (!(shares > 0)) return toast('請輸入持倉數量');
      if (!(cost >= 0)) return toast('請輸入成本價');
      if (edit) Object.assign(h, { shares, cost });
      else {
        const ex = S.holdings.find((x) => x.sym === pick.sym);
        if (ex) { const tot = ex.shares + shares; ex.cost = +((ex.cost * ex.shares + cost * shares) / tot).toFixed(4); ex.shares = tot; toast('已合併至原有持倉'); }
        else S.holdings.push({ id: uid(), sym: pick.sym, code: pick.code, name: pick.name, kind: pick.kind, shares, cost });
        S.tab = pick.kind;
      }
      save(); closeSheet(); render(); if (!edit) refresh(true);
    };
  });
}
function previewHtml(d) {
  const noDiv = d.divSource && d.ttmDps === 0;
  return `<div class="preview"><div style="display:flex;justify-content:space-between;align-items:center"><div><b style="font-size:15px">${esc(d.name || '')}</b> <span class="tag">${KIND[d.kind] || ''}</span></div><span class="n ${cls(d.pct)}">${pct(d.pct, 2, true)}</span></div>
    <div class="pv"><div class="kv"><div class="k">${d.isNav ? '最新淨值' : '現價'}</div><div class="n" style="font-size:17px;margin-top:3px">${isN(d.price) ? d.price.toFixed(3) : NA}</div></div>
    <div class="kv"><div class="k">近12月每${UNIT[d.kind] || '股'}分紅</div><div class="n" style="font-size:17px;margin-top:3px">${d.divSource ? d.ttmDps.toFixed(4) : NA}</div></div>
    <div class="kv"><div class="k">股價息率</div><div class="n" style="font-size:17px;margin-top:3px;color:var(--gold2)">${noDiv ? '不分紅' : pct(d.yield)}</div></div></div>
    <div style="font-size:10.5px;color:var(--mute);margin-top:10px">來源：${esc(d.quoteSource || '—')}／${esc(d.divSource || '—')}</div></div>`;
}
function sheetDetail(id) {
  const h = S.holdings.find((x) => x.id === id); if (!h) return;
  const r = calc().rows.find((x) => x.h.id === id), q = r.q;
  const hist = (q.history || []).filter((d) => d.perShare || d.desc);
  openSheet(`<div style="display:flex;justify-content:space-between;align-items:flex-start"><div><h2>${esc(q.name || h.name)}</h2><div class="desc n">${h.code}　${KIND[h.kind]}${q.time ? '　' + esc(q.time) : ''}</div></div><div style="text-align:right"><div class="n" style="font-size:24px">${isN(r.price) ? r.price.toFixed(3) : NA}</div><div class="n ${cls(r.pct)}">${pct(r.pct, 2, true)}</div></div></div>
    <div class="preview"><div class="pv">
      <div class="kv"><div class="k">股價息率</div><div class="n" style="font-size:18px;color:var(--gold2)">${q.divSource && r.ttm === 0 ? '不分紅' : pct(r.yield)}</div></div>
      <div class="kv"><div class="k">成本息率</div><div class="n" style="font-size:18px">${pct(r.costYield)}</div></div>
      <div class="kv"><div class="k">年度分紅測算</div><div class="n" style="font-size:18px">${money(r.annual)}</div></div>
      <div class="kv"><div class="k">近12月每${UNIT[h.kind]}</div><div class="n" style="font-size:18px">${r.ttm != null ? r.ttm.toFixed(4) : NA}</div></div>
      <div class="kv"><div class="k">浮動盈虧</div><div class="n ${cls(r.pnl)}" style="font-size:18px">${isN(r.pnl) ? money(r.pnl) : NA}</div></div>
      <div class="kv"><div class="k">累計收息</div><div class="n" style="font-size:18px;color:var(--gold2)">${money(r.received)}</div></div></div></div>
    <div class="label" style="margin:6px 0 4px">分紅紀錄 ${q.divSource ? '<span style="letter-spacing:0;font-size:10.5px;color:var(--mute)">（' + esc(q.divSource) + '）</span>' : ''}</div>
    <div class="hist">${hist.length ? hist.map((d) => `<div class="ev"><div class="info"><div class="t">${esc(d.desc)}</div><div class="s n">登記 ${d.record || '—'}　除息 ${d.ex || '—'}　派息 ${d.pay || '—'}</div></div><div class="amt">${d.perShare ? d.perShare.toFixed(4) : '—'}<small>${esc(d.status)}</small></div></div>`).join('') : `<div class="empty" style="padding:18px">${q.divSource ? '尚無分紅紀錄' : '暫無資料'}</div>`}</div>
    <div class="two" style="margin-top:16px"><button class="btn ghost" id="de">${ic('edit')}編輯</button><button class="btn ghost" id="dr">${ic('coin')}記錄到帳</button></div>
    <button class="btn danger block" id="dd" style="margin-top:10px">${ic('trash')}刪除持倉</button>`, (el) => {
    $('#de', el).onclick = () => sheetHolding(h);
    $('#dr', el).onclick = () => sheetRecord({ sym: h.sym, name: q.name || h.name });
    $('#dd', el).onclick = () => { if (confirm('確定刪除這筆持倉？')) { S.holdings = S.holdings.filter((x) => x.id !== id); save(); closeSheet(); render(); } };
  });
}
function sheetMetrics() {
  let sel = [...S.metrics];
  const draw = (el) => { $('#mc', el).innerHTML = Object.entries(METRICS).map(([k, n]) => `<button class="chip ${sel.includes(k) ? 'on' : ''}" data-k="${k}">${n}</button>`).join(''); $('#mn', el).textContent = sel.length; $$('#mc .chip', el).forEach((b) => b.onclick = () => { const k = b.dataset.k; if (sel.includes(k)) sel = sel.filter((x) => x !== k); else if (sel.length < 4) sel.push(k); else return toast('最多選擇 4 項'); draw(el); }); };
  openSheet(`<h2>卡片顯示欄位</h2><div class="desc">選擇 4 項顯示在持倉卡片上（已選 <b id="mn"></b>／4）</div><div class="chips" id="mc"></div><button class="btn block" id="mok" style="margin-top:20px">完成</button>`, (el) => { draw(el); $('#mok', el).onclick = () => { if (sel.length !== 4) return toast('請選滿 4 項'); S.metrics = sel; save(); closeSheet(); render(); }; });
}

/* ---------- 分紅日曆 ---------- */
function events() {
  const out = [];
  S.holdings.forEach((h) => {
    const q = Q[h.sym]; if (!q) return;
    const seen = new Set();
    [...(q.history || []), ...(q.upcoming || [])].forEach((d) => {
      const key = (d.ex || '') + (d.record || '') + d.perShare; if (seen.has(key)) return; seen.add(key);
      const base = { sym: h.sym, name: q.name || h.name, per: d.perShare, amt: d.perShare ? d.perShare * h.shares : null, desc: d.desc, unit: UNIT[h.kind] };
      if (d.record) out.push({ ...base, date: d.record, type: 'r' });
      if (d.ex) out.push({ ...base, date: d.ex, type: 'x' });
      if (d.pay) out.push({ ...base, date: d.pay, type: 'p' });
    });
  });
  return out;
}
const TYPE = { r: ['登記', 'b-r', 'mk-r', '股權登記'], x: ['除息', 'b-x', 'mk-x', '除權除息'], p: ['派息', 'b-p', 'mk-p', '現金派發'] };
function vCal() {
  const ev = events();
  const ym = `${cal.y}-${String(cal.m + 1).padStart(2, '0')}`;
  const first = new Date(cal.y, cal.m, 1), start = new Date(cal.y, cal.m, 1 - first.getDay());
  const td = today();
  let cells = '';
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const es = ev.filter((e) => e.date === ds);
    const types = [...new Set(es.map((e) => e.type))].sort();
    cells += `<button class="d ${d.getMonth() !== cal.m ? 'out' : ''} ${ds === td ? 'today' : ''} ${es.length ? 'has' : ''} ${cal.sel === ds ? 'sel' : ''}" data-day="${ds}">${d.getDate()}<span class="marks">${types.map((t) => `<i class="${TYPE[t][2]}"></i>`).join('')}</span></button>`;
    if (i === 34 && d.getMonth() !== cal.m) break;
  }
  const shown = ev.filter((e) => (cal.sel ? e.date === cal.sel : e.date.startsWith(ym))).sort((a, b) => a.date.localeCompare(b.date) || 'rxp'.indexOf(a.type) - 'rxp'.indexOf(b.type));
  const monthPay = ev.filter((e) => e.type === 'p' && e.date.startsWith(ym)).reduce((a, e) => a + (e.amt || 0), 0);
  const evHtml = shown.map((e) => {
    const done = S.records.some((r) => r.sym === e.sym && r.date === e.date);
    return `<div class="ev"><div class="badge ${TYPE[e.type][1]}">${TYPE[e.type][0]}</div><div class="info"><div class="t">${esc(e.name)}</div><div class="s n">${e.date.slice(5)}　${TYPE[e.type][3]}　每${e.unit} ${e.per ? e.per.toFixed(4) : '—'} 元</div></div><div class="amt">${e.amt != null ? '¥' + money(e.amt) : '—'}<small>${e.type === 'p' ? (done ? '已記錄到帳' : e.date <= td ? `<button class="mini" data-rec="${e.sym}|${e.date}|${e.amt ? e.amt.toFixed(2) : ''}|${esc(e.name)}">記為到帳</button>` : '預估稅前') : '預估稅前'}</small></div></div>`;
  }).join('');
  // 年度總覽
  const Y = String(cal.year);
  const got = Array(12).fill(0), est = Array(12).fill(0);
  S.records.filter((r) => r.date.startsWith(Y)).forEach((r) => (got[+r.date.slice(5, 7) - 1] += r.amount));
  ev.filter((e) => e.type === 'p' && e.date.startsWith(Y) && e.amt).forEach((e) => (est[+e.date.slice(5, 7) - 1] += e.amt));
  const sumGot = got.reduce((a, b) => a + b, 0), sumEst = est.reduce((a, b) => a + b, 0);
  const recs = S.records.filter((r) => r.date.startsWith(Y)).sort((a, b) => b.date.localeCompare(a.date));
  return `<div class="view">${hdr('分紅日曆', '登 記 · 除 息 · 派 息', `<button class="iconbtn" data-act="record" aria-label="記錄到帳">${ic('plus')}</button>`)}
    <section class="card gold">
      <div class="calhead"><button class="iconbtn" data-cal="-1">${ic('chevL')}</button><div class="ym n">${cal.y}<small>年</small> ${cal.m + 1}<small>月</small></div><button class="iconbtn" data-cal="1">${ic('chevR')}</button></div>
      <div class="wk">${'日一二三四五六'.split('').map((d) => `<span>${d}</span>`).join('')}</div>
      <div class="days">${cells}</div>
      <div class="legend" style="grid-template-columns:repeat(3,1fr);margin-top:12px">${['r', 'x', 'p'].map((t) => `<span><i class="dot ${TYPE[t][2]}" style="border-radius:50%"></i>${TYPE[t][3]}</span>`).join('')}</div>
    </section>
    <div class="sect"><h3>${cal.sel ? cal.sel.slice(5).replace('-', '月') + '日' : cal.m + 1 + '月'}事件</h3><span class="more">本月預估派息 <b class="n" style="color:var(--gold2)">¥${money(monthPay)}</b></span></div>
    <section class="card">${evHtml || `<div class="empty" style="padding:20px">${S.holdings.length ? '這段期間沒有分紅事件' : '新增持倉後，這裡會自動顯示分紅日程'}</div>`}</section>
    <div class="sect"><h3>年度總覽</h3><span class="more"><button data-yr="-1">${ic('chevL', 'chev')}</button><b class="n" style="font-size:15px;color:var(--text)">${Y}</b><button data-yr="1">${ic('chevR', 'chev')}</button></span></div>
    <section class="card gold">
      <div style="display:flex;justify-content:space-between"><div class="kv"><div class="k">已到帳（記錄）</div><div class="n" style="font-size:24px;color:var(--gold2);margin-top:3px">¥${money(sumGot)}</div></div><div class="kv" style="text-align:right"><div class="k">依現持倉預估派息</div><div class="n" style="font-size:24px;margin-top:3px">¥${money(sumEst)}</div></div></div>
      ${barChart(got, est)}
      <div class="legend" style="grid-template-columns:1fr 1fr;margin-top:6px"><span><i class="dot t1"></i>已到帳</span><span><i class="dot" style="border:1px solid var(--gold3)"></i>預估派息</span></div>
    </section>
    <div class="sect"><h3>到帳紀錄</h3><button class="more" data-act="record">${ic('plus', 'chev')}手動記錄</button></div>
    <section class="card">${recs.length ? recs.map((r) => `<div class="row"><div class="l"><div class="ic">${ic('coin')}</div><div><div class="t">${esc(r.name)}</div><div class="s n">${r.date}${r.note ? '　' + esc(r.note) : ''}</div></div></div><div style="display:flex;align-items:center;gap:10px"><div class="r" style="color:var(--gold2)">+${money(r.amount)}</div><button data-delrec="${r.id}" aria-label="刪除">${ic('trash', 'chev')}</button></div></div>`).join('') : '<div class="empty" style="padding:20px">今年尚無到帳紀錄</div>'}</section>
    ${disclaimer}</div>`;
}
function barChart(a, b) {
  const W = 340, H = 150, max = Math.max(1, ...a, ...b), bw = W / 12;
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H + 20}"><defs><linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6e6bd"/><stop offset="1" stop-color="#a6844a"/></linearGradient></defs>`;
  [0.25, 0.5, 0.75, 1].forEach((p) => (s += `<line x1="0" x2="${W}" y1="${H - H * p}" y2="${H - H * p}" stroke="rgba(255,255,255,.05)"/>`));
  for (let i = 0; i < 12; i++) {
    const x = i * bw + bw * 0.2, w = bw * 0.6, he = (b[i] / max) * (H - 10), hg = (a[i] / max) * (H - 10);
    if (b[i]) s += `<rect x="${x}" y="${H - he}" width="${w}" height="${he}" rx="4" fill="none" stroke="#a6844a" stroke-dasharray="3 2"/>`;
    if (a[i]) s += `<rect class="bar" x="${x + 2}" y="${H - hg}" width="${w - 4}" height="${hg}" rx="3" fill="url(#bg1)"/>`;
    s += `<text x="${i * bw + bw / 2}" y="${H + 15}" text-anchor="middle">${i + 1}</text>`;
  }
  return s + '</svg>';
}
function sheetRecord(pre = {}) {
  const opts = S.holdings.map((h) => `<option value="${h.sym}" ${pre.sym === h.sym ? 'selected' : ''}>${esc((Q[h.sym]?.name) || h.name)} ${h.code}</option>`).join('');
  openSheet(`<h2>記錄分紅到帳</h2><div class="desc">記下實際入帳金額（稅後），會計入累計收息與年度總覽</div>
    <div class="field"><label>標的</label><select class="input" id="rs">${opts || '<option value="">（請先新增持倉）</option>'}</select></div>
    <div class="two"><div class="field"><label>到帳日期</label><input class="input" type="date" id="rd" value="${pre.date || today()}"></div><div class="field"><label>金額（元）</label><input class="input n" type="number" inputmode="decimal" id="ra" value="${pre.amount || ''}" placeholder="0.00"></div></div>
    <div class="field"><label>備註</label><input class="input" id="rn" placeholder="選填" value="${esc(pre.note || '')}"></div>
    <button class="btn block" id="rok">儲存</button>`, (el) => {
    $('#rok', el).onclick = () => {
      const sym = $('#rs', el).value, amount = parseFloat($('#ra', el).value), date = $('#rd', el).value;
      if (!sym) return toast('請先新增持倉'); if (!(amount > 0)) return toast('請輸入金額'); if (!date) return toast('請選擇日期');
      const h = S.holdings.find((x) => x.sym === sym);
      S.records.push({ id: uid(), sym, name: Q[sym]?.name || h?.name || sym, date, amount, note: $('#rn', el).value.trim() });
      save(); closeSheet(); render(); toast('已記錄到帳');
    };
  });
}

/* ---------- 發現 ---------- */
function project() {
  const c = calc(), p = S.proj;
  const y = (p.yld ?? (c.yield ? +c.yield.toFixed(2) : 5)) / 100;
  let asset = c.mv || 0, invest = c.cost || 0; const rows = [];
  for (let i = 1; i <= p.years; i++) {
    const add = p.monthly * 12; const div = (asset + add / 2) * y;
    invest += add; asset = (asset + add + div * (p.reinvest / 100)) * (1 + p.growth / 100);
    rows.push({ i, invest, asset, div, month: div / 12 });
  }
  return { rows, y: y * 100 };
}
function vFind() {
  const c = calc(), p = S.proj, pr = project(), last = pr.rows[pr.rows.length - 1] || { div: 0, asset: 0, month: 0 };
  const sl = (k, n, min, max, step, unit, val) => `<div class="slider"><div class="top2"><span>${n}</span><b class="n" id="sv-${k}">${val.toLocaleString()}${unit}</b></div><input type="range" data-pj="${k}" min="${min}" max="${max}" step="${step}" value="${val}" style="--p:${((val - min) / (max - min)) * 100}%"></div>`;
  const monthly = c.annual / 12;
  const bills = [...S.bills].sort((a, b) => a.amount - b.amount); let acc = 0;
  const totalBills = S.bills.reduce((a, b) => a + b.amount, 0);
  const cov = totalBills ? Math.min(100, (monthly / totalBills) * 100) : 0;
  const nCovered = bills.filter((b) => (acc += b.amount) <= monthly).length;
  const R = 44, C = 2 * Math.PI * R;
  const watch = S.watch.map((w) => {
    const q = Q[w.sym] || {}; const ttm = q.divSource ? q.ttmDps : null;
    const tp = ttm && w.target ? ttm / (w.target / 100) : null; const ok = isN(q.yield) && q.yield >= w.target;
    const status = ok ? '<span class="tag">已達標</span>' : isN(tp) && isN(q.price) ? `<span class="tag" style="color:var(--sub);border-color:var(--line2)">距目標價 −${(((q.price - tp) / q.price) * 100).toFixed(1)}%</span>` : '';
    return `<div class="row" style="align-items:flex-start"><div class="l" style="align-items:flex-start;min-width:0"><div class="ic">${ic('target')}</div><div style="min-width:0"><div class="t">${esc(q.name || w.name)} <span class="n" style="font-size:12px;color:var(--mute)">${w.code}</span></div><div class="s n" style="margin-top:4px">目標息率 ${w.target}%　目標價 ${tp ? tp.toFixed(3) : '—'}</div><div style="margin-top:6px">${status}</div></div></div><div style="text-align:right;flex:none"><div class="r">${isN(q.price) ? q.price.toFixed(3) : NA}</div><div class="n" style="font-size:13px;margin-top:3px;color:${ok ? 'var(--gold2)' : 'var(--sub)'}">${q.divSource && ttm === 0 ? '不分紅' : pct(q.yield)}</div><button data-delw="${w.sym}" aria-label="移除" style="margin-top:6px">${ic('trash', 'chev')}</button></div></div>`;
  }).join('');
  return `<div class="view">${hdr('發現', '展 望 · 生 活 · 盯 盤')}
    <div class="sect" style="margin-top:4px"><h3>展望未來</h3><span class="more">假設息率 <b class="n" style="color:var(--gold2)">${pr.y.toFixed(2)}%</b></span></div>
    <section class="card hero" style="padding-bottom:12px">
      <div class="label">${p.years} 年後 年分紅</div>
      <div class="big n" id="pjBig"><span class="cur">¥</span>${money(last.div)}</div>
      <div class="hero-sub"><span class="pill">月均 <b class="n">¥${money(last.month)}</b></span><span>資產 <b class="n" style="color:var(--text)">¥${money(last.asset)}</b></span></div>
      ${lineChart(pr.rows)}
    </section>
    <section class="card">
      ${sl('monthly', '每月定投', 0, 30000, 500, ' 元', p.monthly)}
      ${sl('years', '投資年限', 1, 40, 1, ' 年', p.years)}
      ${sl('reinvest', '分紅再投比例', 0, 100, 10, '%', p.reinvest)}
      ${sl('yld', '假設股息率', 1, 10, 0.1, '%', +pr.y.toFixed(1))}
      ${sl('growth', '股價年漲幅', -5, 8, 0.5, '%', p.growth)}
      <div style="font-size:11px;color:var(--mute);margin-top:8px">起點為目前總市值 ¥${money(c.mv)}；股息率預設為目前組合息率，可自行調整。</div>
    </section>
    <section class="card" style="padding:10px 14px"><table class="tb"><thead><tr><th>年</th><th>累計投入</th><th>年末資產</th><th>當年分紅</th><th>月均</th></tr></thead><tbody>${pr.rows.map((r) => `<tr class="${r.i % 5 === 0 ? 'hl' : ''}"><td>${r.i}</td><td>${money(r.invest, 0)}</td><td>${money(r.asset, 0)}</td><td>${money(r.div, 0)}</td><td>${money(r.month, 0)}</td></tr>`).join('')}</tbody></table></section>

    <div class="sect"><h3>生活支出覆蓋</h3><button class="more" data-act="bills">${ic('edit', 'chev')}編輯支出</button></div>
    <section class="card gold"><div class="ring-wrap"><svg width="110" height="110" viewBox="0 0 110 110"><defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e6bd"/><stop offset="1" stop-color="#a6844a"/></linearGradient></defs><circle cx="55" cy="55" r="${R}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="9"/><circle cx="55" cy="55" r="${R}" fill="none" stroke="url(#cg)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(C * cov) / 100} ${C}" transform="rotate(-90 55 55)" style="transition:stroke-dasharray 1s"/><text x="55" y="60" text-anchor="middle" font-family="Didot,Bodoni 72,Noto Serif Display,Georgia,serif" font-size="20" fill="#f0deb0">${cov.toFixed(0)}%</text></svg>
      <div class="rt"><div class="label">每月分紅可支付</div><div class="n" style="font-size:24px;margin:6px 0">¥${money(monthly)}</div><div style="font-size:12.5px;color:var(--sub)">已覆蓋 <b class="n" style="color:var(--gold2)">${nCovered}</b>／${S.bills.length} 項月支出<br>月支出合計 ¥${money(totalBills)}</div></div></div>
      <div style="margin-top:12px">${(() => { let a = 0; return bills.map((b) => { a += b.amount; const ok = a <= monthly; return `<div class="cover"><span class="ck ${ok ? 'ok' : ''}">${ok ? ic('check') : ''}</span><span class="nm">${esc(b.name)}</span><span class="am" style="color:${ok ? 'var(--gold2)' : 'var(--sub)'}">${money(b.amount)}</span></div>`; }).join(''); })()}</div>
    </section>

    <div class="sect"><h3>自選盯盤</h3><button class="more" data-act="watch">${ic('plus', 'chev')}加入自選</button></div>
    <section class="card">${watch || '<div class="empty" style="padding:20px">設定目標股息率，價格到位一眼就知道</div>'}</section>
    ${disclaimer}</div>`;
}
function lineChart(rows) {
  if (!rows.length) return '';
  const W = 340, H = 110, max = Math.max(...rows.map((r) => r.div)) || 1;
  const pts = rows.map((r, i) => [rows.length === 1 ? W / 2 : (i / (rows.length - 1)) * W, H - (r.div / max) * (H - 12)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  return `<svg class="chart" viewBox="0 0 ${W} ${H + 18}" style="margin-top:14px"><defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d6b97f" stop-opacity=".45"/><stop offset="1" stop-color="#d6b97f" stop-opacity="0"/></linearGradient></defs><path d="${d} L${W} ${H} L0 ${H}Z" fill="url(#lg)"/><path d="${d}" fill="none" stroke="#f0deb0" stroke-width="2"/>${pts.filter((_, i) => (i + 1) % 5 === 0 || i === pts.length - 1).map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#f0deb0"/>`).join('')}<text x="0" y="${H + 15}">第1年</text><text x="${W}" y="${H + 15}" text-anchor="end">第${rows.length}年</text></svg>`;
}
function sheetBills() {
  let list = S.bills.map((b) => ({ ...b }));
  const draw = (el) => { $('#bl', el).innerHTML = list.map((b, i) => `<div class="two" style="grid-template-columns:1.3fr 1fr 34px;align-items:center;margin-bottom:8px"><input class="input" data-bn="${i}" value="${esc(b.name)}"><input class="input n" type="number" data-ba="${i}" value="${b.amount}"><button data-bx="${i}">${ic('trash', 'chev')}</button></div>`).join(''); $$('[data-bx]', el).forEach((x) => x.onclick = () => { sync(el); list.splice(+x.dataset.bx, 1); draw(el); }); };
  const sync = (el) => { $$('[data-bn]', el).forEach((x) => (list[+x.dataset.bn].name = x.value)); $$('[data-ba]', el).forEach((x) => (list[+x.dataset.ba].amount = parseFloat(x.value) || 0)); };
  openSheet(`<h2>每月生活支出</h2><div class="desc">填入每月固定開銷，看分紅能覆蓋到哪一項</div><div id="bl"></div><button class="btn ghost block" id="ba">${ic('plus')}新增一項</button><button class="btn block" id="bok" style="margin-top:10px">儲存</button>`, (el) => {
    draw(el); $('#ba', el).onclick = () => { sync(el); list.push({ id: uid(), name: '新支出', amount: 0 }); draw(el); };
    $('#bok', el).onclick = () => { sync(el); S.bills = list.filter((b) => b.name.trim()); save(); closeSheet(); render(); };
  });
}
function sheetWatch() {
  let pick = null;
  openSheet(`<h2>加入自選盯盤</h2><div class="desc">輸入代號，設定你心中的理想股息率</div><div class="field"><label>代號／名稱</label><input class="input" id="wq" autocomplete="off" placeholder="例如 601088"></div><div class="results" id="wr" style="display:none"></div><div id="wp"></div><div class="field"><label>目標股息率（%）</label><input class="input n" id="wt" type="number" step="0.1" value="5"></div><button class="btn block" id="wok">加入</button>`, (el) => {
    let tm; const wq = $('#wq', el), wr = $('#wr', el);
    wq.addEventListener('input', () => { clearTimeout(tm); const v = wq.value.trim(); if (!v) return; tm = setTimeout(async () => {
      const r = await fetch('/api/search?q=' + encodeURIComponent(v)).then((r) => r.json()).catch(() => ({ list: [] }));
      wr.innerHTML = r.list.map((x, i) => `<button data-i="${i}"><span>${esc(x.name)} <span class="n" style="color:var(--mute)">${x.code}</span></span><span class="tag">${KIND[x.kind]}</span></button>`).join('') || '<button disabled><span style="color:var(--mute)">查無結果</span></button>'; wr.style.display = 'block';
      $$('button[data-i]', wr).forEach((b) => b.onclick = async () => { pick = r.list[+b.dataset.i]; wr.style.display = 'none'; wq.value = pick.code + ' ' + pick.name; $('#wp', el).innerHTML = '<div class="preview"><span class="skel" style="width:120px"></span></div>'; const d = await info(pick.sym, pick.kind); if (d.ok) { Q[d.sym] = d; $('#wp', el).innerHTML = previewHtml(d); } else $('#wp', el).innerHTML = `<div class="preview">${NA}</div>`; });
    }, 280); });
    $('#wok', el).onclick = () => { if (!pick) return toast('請先選擇標的'); const t = parseFloat($('#wt', el).value); if (!(t > 0)) return toast('請輸入目標股息率'); S.watch = S.watch.filter((w) => w.sym !== pick.sym); S.watch.push({ sym: pick.sym, code: pick.code, name: pick.name, kind: pick.kind, target: t }); save(); closeSheet(); render(); };
  });
}

/* ---------- 我的 ---------- */
function vMe() {
  const c = calc();
  const row = (icn, t, s, act, right = '') => `<button class="row" style="width:100%;text-align:left" data-act="${act}"><div class="l"><div class="ic">${ic(icn)}</div><div><div class="t">${t}</div><div class="s">${s}</div></div></div>${right || ic('chevR', 'chev')}</button>`;
  return `<div class="view">${hdr('我的', '帳 本 · 備 份 · 設 定')}
    <section class="card hero"><div class="label">我的收息帳本</div><div class="big n" style="font-size:34px"><span class="cur">¥</span>${money(c.received)}</div><div class="hero-sub">累計已到帳分紅　<span class="pill">${S.holdings.length} 檔持倉</span><span class="pill">${S.records.length} 筆紀錄</span></div>
      <div class="grid3"><div class="kv"><div class="k">總投入</div><div class="v n">${money(c.cost)}</div></div><div class="kv"><div class="k">成本息率</div><div class="v n">${pct(c.costYield)}</div></div><div class="kv"><div class="k">分紅回本</div><div class="v n" style="color:var(--gold2)">${pct(c.cost ? (c.received / c.cost) * 100 : 0)}</div></div></div></section>
    <div class="sect"><h3>帳本</h3></div>
    <section class="card" style="padding:4px 16px">
      ${row('coin', '記錄分紅到帳', '手動記下實際入帳金額', 'record')}
      ${row('sliders', '持倉卡片顯示欄位', S.metrics.map((k) => METRICS[k]).join('、'), 'metrics')}
      ${row('sample', '載入範例持倉', '以真實行情試用，可隨時清除', 'sample')}
    </section>
    <div class="sect"><h3>資料備份</h3></div>
    <section class="card" style="padding:4px 16px">
      ${row('down', '匯出備份檔', '下載全部持倉與紀錄（JSON）', 'export')}
      ${row('up', '匯入備份檔', '從備份檔還原，會覆蓋目前資料', 'import')}
      ${row('trash', '清除全部資料', '刪除本機上的所有持倉與紀錄', 'wipe')}
    </section>
    <div class="sect"><h3>關於</h3></div>
    <section class="card" style="padding:4px 16px">
      ${row('db', '資料來源', '行情：騰訊、新浪；分紅：東方財富、天天基金', 'about')}
      ${row('shield', '隱私', '資料只存在這台裝置的瀏覽器，不需登入', 'about')}
    </section>
    ${disclaimer}<div class="src">收息簿　試用版</div><input type="file" id="imp" accept="application/json,.json" hidden></div>`;
}
async function loadSample() {
  const demo = [['sh601398', '601398', '工商銀行', 'stock', 2000, 5.2], ['sh601088', '601088', '中國神華', 'stock', 300, 36.5], ['sh515080', '515080', '中證紅利ETF招商', 'etf', 10000, 1.38], ['sz159307', '159307', '紅利低波100ETF博時', 'etf', 20000, 1.02], ['sh518880', '518880', '黃金ETF華安', 'etf', 1000, 6.5], ['jj008163', '008163', '南方紅利低波50ETF聯接A', 'fund', 5000, 1.05]];
  demo.forEach(([sym, code, name, kind, shares, cost]) => { if (!S.holdings.some((h) => h.sym === sym)) S.holdings.push({ id: uid(), sym, code, name, kind, shares, cost, demo: true }); });
  save(); toast('已載入範例持倉，正在抓取行情'); await refresh();
  // 依真實派息日與範例股數，補上今年已派息的到帳紀錄（標註範例）
  const Y = String(new Date().getFullYear()), td = today();
  events().filter((e) => e.type === 'p' && e.date.startsWith(Y) && e.date <= td && e.amt && S.holdings.find((h) => h.sym === e.sym)?.demo)
    .forEach((e) => { if (!S.records.some((r) => r.sym === e.sym && r.date === e.date)) S.records.push({ id: uid(), sym: e.sym, name: e.name, date: e.date, amount: +e.amt.toFixed(2), note: '範例（稅前）' }); });
  save(); render();
}

/* ---------- 路由與事件 ---------- */
const TABS = [['home', '持倉', 'hold'], ['cal', '分紅日曆', 'cal'], ['find', '發現', 'find'], ['me', '我的', 'me']];
function render() {
  const y = window.scrollY;
  $('#app').innerHTML = { home: vHome, cal: vCal, find: vFind, me: vMe }[view]();
  $('#tabbar').innerHTML = TABS.map(([k, n, i]) => `<button class="${view === k ? 'on' : ''}" data-view="${k}">${ic(i)}<span>${n}</span></button>`).join('');
  window.scrollTo(0, y);
  $$('.view .stagger>*, .view').forEach((e) => (e.style.animation = render._first === view ? 'none' : ''));
  render._first = view;
}
document.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-view],[data-tab],[data-act],[data-open],[data-cal],[data-day],[data-yr],[data-rec],[data-delrec],[data-delw]');
  if (!t) return;
  const d = t.dataset;
  if (d.view) { view = d.view; render._first = null; render(); window.scrollTo(0, 0); return; }
  if (d.tab) { S.tab = d.tab; save(); render._first = null; render(); return; }
  if (d.open) return sheetDetail(d.open);
  if (d.cal) { cal.m += +d.cal; if (cal.m < 0) { cal.m = 11; cal.y--; } if (cal.m > 11) { cal.m = 0; cal.y++; } cal.sel = null; return render(); }
  if (d.day) { cal.sel = cal.sel === d.day ? null : d.day; return render(); }
  if (d.yr) { cal.year += +d.yr; return render(); }
  if (d.rec) { const [sym, date, amount, name] = d.rec.split('|'); return sheetRecord({ sym, date, amount, name, note: '稅前預估，請改成實際金額' }); }
  if (d.delrec) { if (confirm('刪除這筆到帳紀錄？')) { S.records = S.records.filter((r) => r.id !== d.delrec); save(); render(); } return; }
  if (d.delw) { S.watch = S.watch.filter((w) => w.sym !== d.delw); save(); return render(); }
  switch (d.act) {
    case 'add': return sheetHolding();
    case 'refresh': return refresh();
    case 'metrics': return sheetMetrics();
    case 'record': return sheetRecord();
    case 'bills': return sheetBills();
    case 'watch': return sheetWatch();
    case 'sample': return loadSample();
    case 'export': { const b = new Blob([JSON.stringify({ app: '收息簿', v: 1, at: new Date().toISOString(), data: S }, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `收息簿備份-${today()}.json`; a.click(); return toast('已匯出備份檔'); }
    case 'import': return $('#imp').click();
    case 'wipe': if (confirm('確定清除本機全部資料？此動作無法復原，建議先匯出備份。')) { localStorage.removeItem(KEY); localStorage.removeItem(KEY + '.q'); S = DEF(); Q = {}; lastAt = null; render(); toast('已清除'); } return;
    case 'about': return openSheet(`<h2>資料來源與說明</h2><div class="desc" style="line-height:1.9;font-size:13px;color:var(--sub)">・行情：騰訊行情為主，新浪行情為備援；場外基金使用東方財富基金淨值。<br>・個股分紅：東方財富個股分紅資料（含登記、除息、派息日）。<br>・ETF 與基金分紅：天天基金分紅送配資料。<br>・股價息率＝近十二個月（以除息日計）每股稅前現金分紅 ÷ 現價；成本息率＝同一分紅 ÷ 你的成本價。<br>・資料抓取失敗時顯示「暫無資料」，不做任何推估。<br>・所有資料只存在這台裝置的瀏覽器，請定期匯出備份。</div>${disclaimer}<button class="btn block" data-close>知道了</button>`);
  }
});
document.addEventListener('input', (e) => {
  const k = e.target.dataset?.pj; if (!k) return;
  const v = parseFloat(e.target.value); S.proj[k] = v; save();
  const min = +e.target.min, max = +e.target.max; e.target.style.setProperty('--p', ((v - min) / (max - min)) * 100 + '%');
    const lab = $('#sv-' + k); if (lab) lab.textContent = v.toLocaleString() + { monthly: ' 元', years: ' 年', reinvest: '%', yld: '%', growth: '%' }[k];
});
document.addEventListener('change', (e) => {
  if (e.target.dataset?.pj) return render();
  if (e.target.id !== 'imp') return;
  const f = e.target.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => { try { const j = JSON.parse(rd.result); const d = j.data || j; if (!Array.isArray(d.holdings)) throw 0; S = Object.assign(DEF(), d); save(); render(); refresh(); toast('已匯入備份'); } catch { toast('檔案格式不正確'); } };
  rd.readAsText(f);
});
render();
refresh(true);
setInterval(() => { if (!document.hidden) refresh(true); }, 5 * 60 * 1000);
