/**
 * Banc d'essai walk-forward. Usage :  npx tsx research/bench.ts [--months=24] [--fee=0.001] [--cap=100] [--synthetic]
 * Données : historique public Binance 1h (cache dans research/data). Aucun paramètre n'est jugé sur la période où il a été choisi.
 */
import fs from 'fs';
type C = { t: number; o: number; h: number; l: number; c: number };
const arg = (k: string, d: number) => +(process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d);
const MONTHS = arg('months', 24), FEE = arg('fee', 0.001), CAP = arg('cap', 100), SYN = process.argv.includes('--synthetic');
const SLIP = 0.0005, RISK = 0.01, ALLOC = 0.2, MINN = 5, CB = 0.05, H = 3600e3;
const SYMS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'LINK', 'DOT', 'LTC', 'TRX'];

async function load(sym: string): Promise<C[]> {
  const need = MONTHS * 720, f = `research/data/${sym}.json`;
  if (fs.existsSync(f)) { const d = JSON.parse(fs.readFileSync(f, 'utf8')); if (d.length >= need * 0.98) return d.slice(-need); }
  let end = Date.now(), all: C[] = [];
  while (all.length < need) {
    const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${sym}USDT&interval=1h&limit=1000&endTime=${end}`);
    if (!r.ok) throw new Error(`${sym}: HTTP ${r.status}`);
    const rows: any[][] = await r.json(); if (!rows.length) break;
    const part = rows.map((k) => ({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4] })); all = [...part, ...all]; end = part[0].t - 1;
  }
  fs.mkdirSync('research/data', { recursive: true }); fs.writeFileSync(f, JSON.stringify(all)); return all.slice(-need);
}
function synthetic(n: number, seed: number): C[] {
  let s = seed, p = 100; const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const t0 = Math.floor(Date.now() / (4 * H)) * 4 * H - n * H;
  return Array.from({ length: n }, (_, i) => { const o = p, c = o * (1 + (rnd() - 0.5) * 0.016); p = c; return { t: t0 + i * H, o, c, h: Math.max(o, c) * (1 + rnd() * 0.003), l: Math.min(o, c) * (1 - rnd() * 0.003) }; });
}
function align(raw: Record<string, C[]>): Record<string, C[]> {
  const ref = raw.BTC, out: Record<string, C[]> = {};
  for (const [s, a] of Object.entries(raw)) {
    if (a.length < ref.length * 0.95) { console.log(`  ${s} ignoré (historique trop court)`); continue; }
    const m = new Map(a.map((c) => [c.t, c])); let last = a[0];
    out[s] = ref.map((r) => { const c = m.get(r.t); if (c) { last = c; return c; } return { t: r.t, o: last.c, h: last.c, l: last.c, c: last.c }; });
  } return out;
}
const r4 = (a: C[]): C[] => { const o: C[] = []; for (let i = a.findIndex((x) => x.t % (4 * H) === 0); i >= 0 && i + 3 < a.length; i += 4) { const g = a.slice(i, i + 4); o.push({ t: g[0].t, o: g[0].o, h: Math.max(...g.map((x) => x.h)), l: Math.min(...g.map((x) => x.l)), c: g[3].c }); } return o; };

const ema = (a: number[], p: number) => { const k = 2 / (p + 1), o: number[] = []; a.forEach((v, i) => o.push(i ? v * k + o[i - 1] * (1 - k) : v)); return o; };
const rsi = (a: number[], p = 14) => { const o = Array(a.length).fill(50); let g = 0, l = 0; for (let i = 1; i < a.length; i++) { const d = a[i] - a[i - 1], u = Math.max(d, 0), w = Math.max(-d, 0); if (i <= p) { g += u / p; l += w / p; } else { g = (g * (p - 1) + u) / p; l = (l * (p - 1) + w) / p; } if (i >= p) o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); } return o; };
const atr = (c: C[], p = 14) => { const o: number[] = []; let a = 0; c.forEach((x, i) => { const tr = i ? Math.max(x.h - x.l, Math.abs(x.h - c[i - 1].c), Math.abs(x.l - c[i - 1].c)) : x.h - x.l; a = i < p ? (a * i + tr) / (i + 1) : (a * (p - 1) + tr) / p; o.push(a); }); return o; };
const hh = (a: number[], n: number) => a.map((_, i) => (i < n ? Infinity : Math.max(...a.slice(i - n, i))));

interface Sig { entry: boolean[]; dist: number[]; tpR: number; exit?: boolean[] }
interface Cfg { fam: string; id: string; tf: 1 | 4; mk: (c: C[]) => Sig }
const cfgs: Cfg[] = [];
for (const sl of [0.015, 0.025]) for (const tr of [false, true]) cfgs.push({ fam: 'EMA9/21 + RSI (1h)', id: `SL ${sl * 100}% tendance=${tr}`, tf: 1, mk: (c) => { const cl = c.map((x) => x.c), e9 = ema(cl, 9), e21 = ema(cl, 21), e200 = ema(cl, 200), r = rsi(cl); return { tpR: 2, dist: cl.map((p) => p * sl), entry: cl.map((p, i) => i > 3 && e9[i] > e21[i] && e9[i - 1] <= e21[i - 1] && r[i] < 70 && (!tr || (p > e200[i] && r[i] >= 45))) }; } });
for (const n of [20, 40]) for (const k of [2, 3]) for (const tp of [2, 3]) cfgs.push({ fam: 'Cassure Donchian (4h)', id: `N${n} stop ${k}ATR TP ${tp}R`, tf: 4, mk: (c) => { const cl = c.map((x) => x.c), h = hh(c.map((x) => x.h), n), e = ema(cl, 200), a = atr(c); return { tpR: tp, dist: a.map((v) => v * k), entry: cl.map((p, i) => p > h[i] && p > e[i]) }; } });
for (const k of [2, 3]) for (const tp of [1.5, 2]) cfgs.push({ fam: 'Repli en tendance (4h)', id: `stop ${k}ATR TP ${tp}R`, tf: 4, mk: (c) => { const cl = c.map((x) => x.c), e50 = ema(cl, 50), e200 = ema(cl, 200), r = rsi(cl), a = atr(c); return { tpR: tp, dist: a.map((v) => v * k), entry: cl.map((p, i) => i > 1 && e50[i] > e200[i] && p > e200[i] && r[i - 1] < 40 && r[i] >= 40) }; } });
for (const lo of [25, 30]) for (const k of [2, 3]) cfgs.push({ fam: 'Rebond RSI (1h)', id: `RSI<${lo} stop ${k}ATR`, tf: 1, mk: (c) => { const cl = c.map((x) => x.c), e200 = ema(cl, 200), r = rsi(cl), a = atr(c); return { tpR: Infinity, dist: a.map((v) => v * k), entry: cl.map((p, i) => r[i] < lo && p > e200[i]), exit: r.map((v) => v > 55) }; } });

// ---- SMC mécanique (spot = achats uniquement) : pivots confirmés, balayage de liquidité, FVG après cassure de structure ----
function swings(c: C[], k = 3) { const lo: number[] = [], hi: number[] = []; let L = NaN, Hh = NaN; for (let i = 0; i < c.length; i++) { const p = i - k; if (p >= k) { let isL = true, isH = true; for (let j = p - k; j <= p + k; j++) { if (j === p) continue; if (c[j].l <= c[p].l) isL = false; if (c[j].h >= c[p].h) isH = false; } if (isL) L = c[p].l; if (isH) Hh = c[p].h; } lo.push(L); hi.push(Hh); } return { lo, hi }; }
const sweep = (tr: boolean, tp: number) => (c: C[]): Sig => { const { lo } = swings(c), a = atr(c), e = ema(c.map((x) => x.c), 200); return { tpR: tp, dist: c.map((x, i) => x.c - x.l + 0.25 * a[i]), entry: c.map((x, i) => lo[i] === lo[i] && x.l < lo[i] && x.c > lo[i] && (!tr || x.c > e[i])) }; };
const fvg = (tr: boolean, tp: number) => (c: C[]): Sig => { const { hi } = swings(c), a = atr(c), e = ema(c.map((x) => x.c), 200), entry = c.map(() => false), dist = c.map(() => 0); let z: { b: number; t: number; i: number } | null = null;
  for (let i = 3; i < c.length; i++) {
    if (z && i > z.i) { if (c[i].c < z.b || i > z.i + 20) z = null; else if (c[i].l <= z.t && c[i].c > c[i].o && (!tr || c[i].c > e[i])) { entry[i] = true; dist[i] = c[i].c - (z.b - 0.5 * a[i]); z = null; } }
    if (c[i].l > c[i - 2].h && hi[i - 2] === hi[i - 2] && c[i - 1].c > hi[i - 2]) z = { b: c[i - 2].h, t: c[i].l, i };
  } return { tpR: tp, dist, entry }; };
for (const tf of [1, 4] as const) for (const tr of [false, true]) for (const tp of [2, 3]) cfgs.push({ fam: `SMC balayage de liquidité (${tf}h)`, id: `tendance=${tr} TP ${tp}R`, tf, mk: sweep(tr, tp) });
for (const tr of [false, true]) for (const tp of [2, 3]) cfgs.push({ fam: 'SMC FVG après cassure (4h)', id: `tendance=${tr} TP ${tp}R`, tf: 4, mk: fvg(tr, tp) });

type T = { pnl: number };
function run(S: string[], cs: Record<string, C[]>, sg: Record<string, Sig>, s: number, e: number) {
  let cash = CAP, open: any[] = [], pend: string[] = [], dk = -1, d0 = CAP, halt = false, fees = 0; const tr: T[] = [];
  const mark = (i: number) => cash + open.reduce((a, p) => a + p.q * cs[p.s][i].c, 0);
  const close = (p: any, px: number) => { const f = p.q * px * FEE; cash += p.q * px - f; fees += p.f + f; tr.push({ pnl: p.q * (px - p.en) - p.f - f }); };
  for (let i = s; i < e; i++) {
    const d = Math.floor(cs[S[0]][i].t / 864e5); if (d !== dk) { dk = d; d0 = mark(i - 1); halt = false; }
    if (!halt) for (const y of pend) {
      if (open.length >= 5 || open.some((p) => p.s === y)) continue;
      const px = cs[y][i].o * (1 + SLIP), dist = sg[y].dist[i - 1]; if (!(dist > 0) || dist >= px) continue;
      const eq = mark(i - 1), sz = Math.min((eq * RISK) / (dist / px), eq * ALLOC, cash * 0.95); if (sz < MINN) continue;
      const f = sz * FEE; cash -= sz + f; open.push({ s: y, en: px, q: sz / px, sl: px - dist, tp: px + dist * sg[y].tpR, f });
    }
    pend = [];
    open = open.filter((p) => { const c = cs[p.s][i]; if (c.l <= p.sl) { close(p, p.sl * (1 - SLIP)); return false; } if (c.h >= p.tp) { close(p, p.tp); return false; } if (sg[p.s].exit?.[i]) { close(p, c.c); return false; } return true; });
    if (!halt && (d0 - mark(i)) / d0 >= CB) { halt = true; open.forEach((p) => close(p, cs[p.s][i].c)); open = []; }
    if (!halt) for (const y of S) if (sg[y].entry[i]) pend.push(y);
  }
  open.forEach((p) => close(p, cs[p.s][e - 1].c));
  return { tr, fees };
}
const stat = (tr: T[]) => { const w = tr.filter((x) => x.pnl > 0), l = tr.filter((x) => x.pnl <= 0), gw = w.reduce((a, x) => a + x.pnl, 0), gl = Math.abs(l.reduce((a, x) => a + x.pnl, 0)); return { n: tr.length, win: tr.length ? (w.length / tr.length) * 100 : 0, net: (tr.reduce((a, x) => a + x.pnl, 0) / CAP) * 100, pf: gl > 0 ? gw / gl : gw > 0 ? 9.99 : 0 }; };

async function main() {
  const raw: Record<string, C[]> = {};
  for (const s of SYMS) { process.stdout.write(`${SYN ? 'génération' : 'téléchargement'} ${s}… `); raw[s] = SYN ? synthetic(MONTHS * 720, SYMS.indexOf(s) + 3) : await load(s); console.log(raw[s].length); }
  const al = align(raw), S = Object.keys(al);
  const data: Record<number, Record<string, C[]>> = { 1: al, 4: Object.fromEntries(S.map((s) => [s, r4(al[s])])) };
  const sigs = cfgs.map((c) => Object.fromEntries(S.map((s) => [s, c.mk(data[c.tf][s])])));
  const lines: string[] = [`# Banc d'essai walk-forward (${MONTHS} mois, ${S.length} paires, frais ${(FEE * 100).toFixed(3)}%/côté, capital ${CAP} USDT)\n`, `${SYN ? '**DONNÉES SYNTHÉTIQUES : test de code uniquement.**\n' : ''}`, '| Famille | Folds | Trades test | Réussite | Net moyen / 3 mois | PF | Folds positifs | Verdict |', '|---|---|---|---|---|---|---|---|'];
  for (const fam of [...new Set(cfgs.map((c) => c.fam))]) {
    const idx = cfgs.map((c, i) => (c.fam === fam ? i : -1)).filter((i) => i >= 0), tf = cfgs[idx[0]].tf, cs = data[tf], N = cs[S[0]].length;
    const bpm = 720 / tf, warm = tf === 1 ? 250 : 210, TR = 6 * bpm, TE = 3 * bpm; let all: T[] = [], nets: number[] = [], f = 0;
    for (let a = warm; a + TR + TE <= N; a += TE) {
      f++;
      const sc = idx.map((i) => ({ i, st: stat(run(S, cs, sigs[i], a, a + TR).tr) })).filter((x) => x.st.n >= 25 && x.st.pf > 1.1).sort((x, y) => y.st.net - x.st.net);
      if (!sc.length) { nets.push(0); console.log(`  [${fam}] fold ${f}: aucune config valide en entraînement -> pas de trade`); continue; }
      const r = run(S, cs, sigs[sc[0].i], a + TR, a + TR + TE), st = stat(r.tr); all = all.concat(r.tr); nets.push(st.net);
      console.log(`  [${fam}] fold ${f}: ${cfgs[sc[0].i].id} | entraînement ${sc[0].st.net.toFixed(1)}% -> TEST ${st.net.toFixed(1)}% (${st.n} trades)`);
    }
    const st = stat(all), mean = nets.reduce((x, y) => x + y, 0) / (nets.length || 1), pos = nets.filter((x) => x > 0).length;
    const ok = st.n >= 40 && st.pf >= 1.2 && mean > 0 && pos / (nets.length || 1) >= 0.6;
    lines.push(`| ${fam} | ${f} | ${st.n} | ${st.win.toFixed(0)}% | ${mean.toFixed(2)}% | ${st.pf.toFixed(2)} | ${pos}/${nets.length} | ${ok ? '**CANDIDATE**' : 'rejetée'} |`);
  }
  fs.writeFileSync('research/report.md', lines.join('\n') + '\n\nCandidate = ≥40 trades test, PF ≥ 1,2, net moyen > 0 et ≥ 60 % de folds positifs. Biais connu : paires actuelles = survivantes.\n');
  console.log('\n' + lines.join('\n') + '\n\n-> research/report.md');
}
main();
