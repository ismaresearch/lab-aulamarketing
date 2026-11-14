// Prebuild: copia (sin modificar) los JSON de ../extraccion, ../capas y ../investigacion
// necesarios a src/data/ para que Astro los cargue en tiempo de build.
// Si ../extraccion no existe (p. ej. CI con solo la carpeta sitio/), se conserva la
// instantánea ya presente en src/data/ y el build continúa con ella.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITIO = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAIZ = join(SITIO, '..');
const DATA = join(SITIO, 'src', 'data');

const FUENTES = [
  { de: 'extraccion', a: 'extraccion' },
  { de: 'capas/correcciones', a: 'capas/correcciones' },
  { de: 'capas/herramientas', a: 'capas/herramientas' },
  { de: 'capas/prompts', a: 'capas/prompts' },
  { de: 'capas/resumenes', a: 'capas/resumenes' },
  { de: 'capas/glosario', a: 'capas/glosario' },
  { de: 'capas/planes', a: 'capas/planes' },
  { de: 'investigacion/videos_pendientes.json', a: 'investigacion/videos_pendientes.json' },
  { de: 'investigacion/estado_herramientas.json', a: 'investigacion/estado_herramientas.json' },
];

function jsonFiles(dir) {
  const out = [];
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    const s = statSync(p);
    if (s.isDirectory()) { if (n !== 'scripts' && !n.startsWith('_') && !n.startsWith('.')) out.push(...jsonFiles(p)); }
    else if (n.endsWith('.json')) out.push(p);
  }
  return out;
}

if (!existsSync(join(RAIZ, 'extraccion'))) {
  console.log('[prebuild] ../extraccion no existe: se usa la instantánea de src/data/');
  process.exit(0);
}

const copiados = [];
for (const f of FUENTES) {
  const src = join(RAIZ, f.de);
  const dst = join(DATA, f.a);
  if (existsSync(dst)) rmSync(dst, { recursive: true, force: true });
  if (!existsSync(src)) { console.log(`[prebuild] (falta) ${f.de} → se usarán marcadores [pendiente]`); continue; }
  if (statSync(src).isDirectory()) {
    for (const file of jsonFiles(src)) {
      const to = join(dst, relative(src, file));
      mkdirSync(dirname(to), { recursive: true });
      cpSync(file, to);
      copiados.push(relative(RAIZ, file));
    }
  } else {
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(src, dst);
    copiados.push(f.de);
  }
}
writeFileSync(join(DATA, 'manifest.json'), JSON.stringify({ generado: new Date().toISOString(), archivos: copiados }, null, 2));
console.log(`[prebuild] ${copiados.length} archivos JSON copiados a src/data/`);
