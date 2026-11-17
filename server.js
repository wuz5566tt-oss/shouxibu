// 收息簿 — 後端：代號查詢、行情、分紅資料（免費公開來源，含快取與備援）
const express = require('express');
const path = require('path');
const OpenCC = require('opencc-js');
const toTW = OpenCC.Converter({ from: 'cn', to: 'tw' });

const app = express();
const PORT = process.env.PORT || 3000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

// ---------- 快取 ----------
const cache = new Map();
async function cached(key, ttlMs, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < ttlMs) return hit.v;
  const v = await fn();
  cache.set(key, { t: Date.now(), v });
  return v;
}
const QUOTE_TTL = 60 * 1000;          // 行情 1 分鐘
const DIV_TTL = 6 * 3600 * 1000;      // 分紅 6 小時
const SEARCH_TTL = 24 * 3600 * 1000;  // 搜尋 1 天

async function get(url, { headers = {}, encoding = 'utf-8', timeout = 8000 } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, signal: ctl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    return new TextDecoder(encoding).decode(buf);
  } finally { clearTimeout(timer); }
}

const num = (s) => { const n = parseFloat(s); return Number.isFinite(n) ? n : null; };
const day = (s) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);
const todayStr = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10); // 中國/台灣時區日期

// ---------- 搜尋（騰訊 smartbox）----------
const TYPE_MAP = { 'GP-A': 'stock', 'GP-A-KCB': 'stock', 'GP-A-CYB': 'stock', ETF: 'etf', LOF: 'fund', KJ: 'fund', QDII: 'fund', FJ: 'fund' };
async function search(q) {
  return cached('s:' + q, SEARCH_TTL, async () => {
    const txt = await get('https://smartbox.gtimg.cn/s3/?v=2&t=all&c=1&q=' + encodeURIComponent(q));
    const m = txt.match(/v_hint="(.*)"/);
    if (!m || m[1] === 'N') return [];
    const raw = JSON.parse('"' + m[1] + '"');
    return raw.split('^').map((row) => {
      const [mk, code, name, , type] = row.split('~');
      return { mk, code, name: toTW(name || ''), type };
    }).filter((x) => ['sh', 'sz', 'jj'].includes(x.mk) && TYPE_MAP[x.type])
      .map((x) => ({ sym: x.mk + x.code, market: x.mk, code: x.code, name: x.name, kind: TYPE_MAP[x.type] }));
  });
}

// ---------- 行情 ----------
async function quoteTencent(syms) {
  const txt = await get('https://qt.gtimg.cn/q=' + syms.join(','), { encoding: 'gbk' });
  const out = {};
  for (const line of txt.split(';')) {
    const m = line.match(/v_(\w+)="(.*)"/);
    if (!m) continue;
    const f = m[2].split('~');
    if (f.length < 40 || !num(f[3])) continue;
    const t = f[30] || '';
    out[m[1]] = {
      name: toTW(f[1]), price: num(f[3]), prevClose: num(f[4]), change: num(f[31]), pct: num(f[32]),
      time: t.length >= 12 ? `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)} ${t.slice(8, 10)}:${t.slice(10, 12)}` : null,
      source: '騰訊行情',
    };
  }
  return out;
}
async function quoteSina(syms) {
  const txt = await get('https://hq.sinajs.cn/list=' + syms.join(','), { headers: { Referer: 'https://finance.sina.com.cn' }, encoding: 'gbk' });
  const out = {};
  for (const line of txt.split(';')) {
    const m = line.match(/hq_str_(\w+)="(.*)"/);
    if (!m) continue;
    const f = m[2].split(',');
    const price = num(f[3]), prev = num(f[2]);
    if (!price || !prev) continue;
    out[m[1]] = { name: toTW(f[0]), price, prevClose: prev, change: +(price - prev).toFixed(3), pct: +((price / prev - 1) * 100).toFixed(2), time: `${f[30]} ${(f[31] || '').slice(0, 5)}`, source: '新浪行情' };
  }
  return out;
}
async function quoteFund(code) {
  const txt = await get(`https://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=1&pageSize=1`, { headers: { Referer: 'https://fundf10.eastmoney.com/' } });
  const row = JSON.parse(txt)?.Data?.LSJZList?.[0];
  if (!row || !num(row.DWJZ)) return null;
  return { price: num(row.DWJZ), pct: num(row.JZZZL), change: null, prevClose: null, time: row.FSRQ, source: '東方財富基金淨值', isNav: true };
}
async function quotes(syms) {
  const listed = syms.filter((s) => /^(sh|sz)\d{6}$/.test(s));
  const funds = syms.filter((s) => /^jj\d{6}$/.test(s));
  const out = {};
  const need = [];
  for (const s of listed) { const h = cache.get('q:' + s); if (h && Date.now() - h.t < QUOTE_TTL) out[s] = h.v; else need.push(s); }
  if (need.length) {
    let got = {};
    try { got = await quoteTencent(need); } catch (e) { console.warn('tencent fail', e.message); }
    const miss = need.filter((s) => !got[s]);
    if (miss.length) { try { Object.assign(got, await quoteSina(miss)); } catch (e) { console.warn('sina fail', e.message); } }
    for (const s of need) if (got[s]) { cache.set('q:' + s, { t: Date.now(), v: got[s] }); out[s] = got[s]; }
  }
  await Promise.all(funds.map(async (s) => {
    try { const q = await cached('q:' + s, QUOTE_TTL * 10, () => quoteFund(s.slice(2))); if (q) out[s] = q; } catch (e) { console.warn('fund nav fail', s, e.message); }
  }));
  return out;
}

// ---------- 分紅 ----------
// 個股：東方財富 F10 分紅（含派息日），備援：東方財富資料中心
function parsePerShare(profile) {
  const m = (profile || '').match(/(\d+)派([\d.]+)元/);
  return m ? +(num(m[2]) / num(m[1])).toFixed(6) : null;
}
async function stockDivs(sym) {
  const code = sym.slice(2);
  try {
    const txt = await get(`https://emweb.securities.eastmoney.com/PC_HSF10/BonusFinancing/PageAjax?code=${sym.toUpperCase()}`);
    const rows = JSON.parse(txt).fhyx || [];
    if (rows.length) return { source: '東方財富 F10 分紅', list: rows.map((r) => ({
      notice: day(r.NOTICE_DATE), record: day(r.EQUITY_RECORD_DATE), ex: day(r.EX_DIVIDEND_DATE), pay: day(r.PAY_CASH_DATE),
      perShare: parsePerShare(r.IMPL_PLAN_PROFILE), desc: toTW(r.IMPL_PLAN_PROFILE || ''), status: toTW(r.ASSIGN_PROGRESS || ''),
    })) };
  } catch (e) { console.warn('emweb fail', sym, e.message); }
  const txt = await get(`https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_SHAREBONUS_DET&columns=ALL&filter=(SECURITY_CODE=%22${code}%22)&pageSize=40&sortColumns=PLAN_NOTICE_DATE&sortTypes=-1`);
  const rows = JSON.parse(txt)?.result?.data || [];
  return { source: '東方財富資料中心', list: rows.map((r) => ({
    notice: day(r.PLAN_NOTICE_DATE), record: day(r.EQUITY_RECORD_DATE), ex: day(r.EX_DIVIDEND_DATE), pay: null,
    perShare: r.PRETAX_BONUS_RMB != null ? +(r.PRETAX_BONUS_RMB / 10).toFixed(6) : null,
    desc: toTW(r.IMPL_PLAN_PROFILE || ''), status: toTW(r.ASSIGN_PROGRESS || ''),
  })) };
}
// 基金／ETF：天天基金 分紅送配頁
async function fundDivs(code) {
  const html = await get(`https://fundf10.eastmoney.com/fhsp_${code}.html`);
  const tbl = html.match(/<table class='w782 comm cfxq'>([\s\S]*?)<\/table>/);
  const list = [];
  if (tbl) {
    for (const tr of tbl[1].match(/<tr>[\s\S]*?<\/tr>/g) || []) {
      const td = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
      if (td.length < 5) continue;
      const m = td[3].match(/派现金([\d.]+)元/);
      list.push({ notice: null, record: day(td[1]), ex: day(td[2]), pay: day(td[4]), perShare: m ? +(num(m[1]) / 10).toFixed(6) : null, desc: toTW(td[3]), status: '已實施' });
    }
  }
  if (!tbl) throw new Error('fundf10 無分紅表');
  return { source: '天天基金 分紅送配', list };
}
// 基金分紅備援：新浪基金（只有登記日、發放日、每份分紅）
async function fundDivsSina(code) {
  const j = JSON.parse(await get(`https://stock.finance.sina.com.cn/fundInfo/api/openapi.php/FundPageInfoService.tabfh?symbol=${code}&format=json`));
  const rows = j?.result?.data?.fhdata;
  if (!Array.isArray(rows)) throw new Error('sina 無資料');
  return { source: '新浪基金 分紅', list: rows.filter((r) => num(r.mffh)).map((r) => ({ notice: null, record: day(r.djr), ex: null, pay: day(r.fhr), perShare: num(r.mffh), desc: `每份派現金${r.mffh}元`, status: '已實施' })) };
}
async function dividends(sym, kind) {
  return cached('d:' + sym, DIV_TTL, () => (kind === 'stock' ? stockDivs(sym) : fundDivs(sym.slice(2)).catch((e) => { console.warn('fundf10 fail', sym, e.message); return fundDivsSina(sym.slice(2)); })));
}
function summarize(list) {
  const today = todayStr();
  const yearAgo = new Date(Date.parse(today) - 365 * 86400e3).toISOString().slice(0, 10);
  const valid = list.filter((d) => d.perShare);
  const ttmItems = valid.filter((d) => { const t = d.ex || d.record; return t && t <= today && t > yearAgo; });
  const ttm = +ttmItems.reduce((a, d) => a + d.perShare, 0).toFixed(6);
  const upcoming = list.filter((d) => (d.ex && d.ex > today) || (!d.ex && d.perShare && !/不分配|未通過|停止/.test(d.status) && (!d.notice || d.notice > yearAgo)));
  return { ttm, ttmCount: ttmItems.length, upcoming };
}

// ---------- 判斷代號 ----------
async function resolve(input, kindHint) {
  const s = String(input || '').trim().toLowerCase();
  if (/^(sh|sz|jj)\d{6}$/.test(s)) {
    const r = await search(s.slice(2)).catch(() => []);
    return r.find((x) => x.sym === s) || { sym: s, market: s.slice(0, 2), code: s.slice(2), name: null, kind: s.startsWith('jj') ? 'fund' : (kindHint || 'stock') };
  }
  const r = await search(s);
  if (!r.length) return null;
  if (kindHint) { const k = r.find((x) => x.kind === kindHint && (x.code === s || !/^\d{6}$/.test(s))); if (k) return k; }
  return r.find((x) => x.code === s && x.market !== 'jj') || r.find((x) => x.code === s) || r[0];
}

async function fullInfo(sym, kind) {
  const info = { sym, kind, price: null, errors: [] };
  const [q, d] = await Promise.all([
    quotes([sym]).then((o) => o[sym] || null).catch(() => null),
    dividends(sym, kind).catch((e) => { info.errors.push('分紅資料暫無'); console.warn('div fail', sym, e.message); return null; }),
  ]);
  if (q) Object.assign(info, q, { quoteSource: q.source }); else info.errors.push('行情暫無');
  delete info.source;
  if (d) {
    const s = summarize(d.list);
    Object.assign(info, { divSource: d.source, history: d.list.slice(0, 24), ttmDps: s.ttm, ttmCount: s.ttmCount, upcoming: s.upcoming });
    info.yield = q && q.price ? +(s.ttm / q.price * 100).toFixed(3) : null;
  }
  return info;
}

// ---------- API ----------
app.get('/api/search', async (req, res) => {
  try { res.json({ ok: true, list: (await search(String(req.query.q || '').trim())).slice(0, 12) }); }
  catch (e) { res.json({ ok: false, list: [], error: '搜尋服務暫無回應' }); }
});
app.get('/api/info', async (req, res) => {
  try {
    const r = await resolve(req.query.q, req.query.kind);
    if (!r) return res.json({ ok: false, error: '查無此代號' });
    const info = await fullInfo(r.sym, r.kind);
    res.json({ ok: true, ...r, ...info, name: info.name || r.name });
  } catch (e) { console.warn(e); res.json({ ok: false, error: '暫無資料' }); }
});
// 批次：?items=sh601398:stock,sz159307:etf
app.get('/api/batch', async (req, res) => {
  const items = String(req.query.items || '').split(',').filter(Boolean).slice(0, 60).map((x) => { const [sym, kind] = x.split(':'); return { sym: sym.toLowerCase(), kind: kind || 'stock' }; })
    .filter((x) => /^(sh|sz|jj)\d{6}$/.test(x.sym));
  await quotes(items.map((x) => x.sym)).catch(() => {}); // 先批次預熱行情
  const out = {};
  await Promise.all(items.map(async (x) => { out[x.sym] = await fullInfo(x.sym, x.kind).catch(() => ({ sym: x.sym, errors: ['暫無資料'] })); }));
  res.json({ ok: true, data: out, at: new Date().toISOString() });
});
app.get('/healthz', (req, res) => res.send('ok'));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 0 }));
app.listen(PORT, () => console.log('收息簿 running on :' + PORT));
