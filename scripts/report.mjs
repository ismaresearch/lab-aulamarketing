// Informe del build: páginas por tipo y peso del sitio.
import { readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const files = [];
(function walk(d) { for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? walk(p) : files.push(p); } })(DIST);
const tipos = {};
const tipo = (r) => {
  if (r === 'index.html') return 'inicio';
  if (r === '404.html') return '404';
  const seg = r.split('/');
  if (seg[0] === 'planes') {
    if (seg.length === 2) return 'planes (catálogo)';
    if (seg.length === 3) return 'planes/[slug]';
    if (seg[2] === 'cadena') return 'planes/[slug]/cadena/[id]';
    return 'planes/[slug]/[paso]';
  }
  if (['prompts', 'herramientas', 'glosario'].includes(seg[0])) return seg.length === 2 ? `${seg[0]} (índice)` : `${seg[0]}/[id]`;
  return 'otras (' + seg[0] + ')';
};
let pesoHtml = 0, pesoAssets = 0, pesoOtros = 0;
for (const f of files) {
  const r = relative(DIST, f);
  const s = statSync(f).size;
  if (r.endsWith('.html')) { pesoHtml += s; const t = tipo(r); tipos[t] = (tipos[t] || 0) + 1; }
  else if (r.startsWith('_astro')) pesoAssets += s;
  else pesoOtros += s;
}
const mb = (b) => (b / 1024 / 1024).toFixed(2) + ' MB';
console.log('[informe] Páginas HTML por tipo:');
for (const [k, v] of Object.entries(tipos).sort()) console.log(`  ${String(v).padStart(4)}  ${k}`);
console.log(`[informe] Total HTML: ${Object.values(tipos).reduce((a, b) => a + b, 0)} · Peso HTML ${mb(pesoHtml)} · assets _astro ${mb(pesoAssets)} · otros ${mb(pesoOtros)} · total ${mb(pesoHtml + pesoAssets + pesoOtros)}`);
const js = files.filter((f) => f.endsWith('.js')).map((f) => [relative(DIST, f), statSync(f).size]).sort((a, b) => b[1] - a[1]);
for (const [f, s] of js) console.log(`  js ${(s / 1024).toFixed(1).padStart(7)} KB  ${f}`);
