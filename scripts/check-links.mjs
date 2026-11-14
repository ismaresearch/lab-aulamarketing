// Comprueba enlaces internos (href/src que empiezan por "/") y anclas "#id" de la misma página en dist/.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const html = [];
(function walk(d) { for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') && html.push(p); } })(DIST);

function existe(url) {
  const limpio = decodeURIComponent(url.split('#')[0].split('?')[0]);
  if (!limpio) return true;
  const p = join(DIST, limpio);
  if (existsSync(p) && statSync(p).isFile()) return true;
  if (existsSync(join(p, 'index.html'))) return true;
  return false;
}
const rotos = new Map();
let total = 0, anclasRotas = 0;
for (const f of html) {
  const s = readFileSync(f, 'utf8');
  const ids = new Set([...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const m of s.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const u = m[1].replace(/&amp;/g, '&');
    if (u.startsWith('#')) {
      total++;
      if (u.length > 1 && !ids.has(u.slice(1))) { anclasRotas++; const k = `${u} (en ${f.replace(DIST, '')})`; rotos.set(k, (rotos.get(k) || 0) + 1); }
      continue;
    }
    if (!u.startsWith('/') || u.startsWith('//')) continue;
    total++;
    if (!existe(u)) { const k = `${u} (desde ${f.replace(DIST, '')})`; rotos.set(k, (rotos.get(k) || 0) + 1); }
  }
}
console.log(`[enlaces] ${html.length} páginas HTML · ${total} enlaces internos comprobados · ${rotos.size} rotos${anclasRotas ? ` (${anclasRotas} anclas)` : ''}`);
for (const [k] of [...rotos].slice(0, 40)) console.log('  ROTO', k);
if (rotos.size) process.exitCode = 1;
