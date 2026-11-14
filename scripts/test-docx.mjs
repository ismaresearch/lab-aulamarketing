// Prueba del export .docx con LA MISMA función que usa el navegador (src/lib/docx-export.js).
// Genera dos documentos en tmp/: plan modelo del libro (a partir de dist/datos/planes.json) y un plan de alumno ficticio.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aBuffer } from '../src/lib/docx-export.js';

const SITIO = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = JSON.parse(readFileSync(join(SITIO, 'src/config/site.json'), 'utf8'));
const datosPath = join(SITIO, 'dist/datos/planes.json');
if (!existsSync(datosPath)) { console.error('Ejecuta antes npm run build'); process.exit(1); }
const { planes } = JSON.parse(readFileSync(datosPath, 'utf8'));
mkdirSync(join(SITIO, 'tmp'), { recursive: true });

const ejemplo = {
  proyecto: 'aulamarketing.digital', modo: 'ejemplo', titulo_documento: 'Plan completo de marketing digital', libro: site.libro,
  planes: planes.map((pl) => ({ titulo: pl.titulo, capitulo: pl.capitulo, titulo_capitulo: pl.titulo_capitulo,
    entregables: pl.entregables_libro.map((x) => ({ titulo: x.titulo, origen: `Libro · cap. ${pl.capitulo}`, contenido: x.texto, tabla: x.tabla })) })),
};
const b1 = await aBuffer(ejemplo);
writeFileSync(join(SITIO, 'tmp/prueba-plan-completo-ejemplo.docx'), b1);

const seo = planes.find((p) => p.slug === 'seo');
const alumno = {
  proyecto: 'Proyecto de prueba', modo: 'proyecto', titulo_documento: seo.titulo, libro: site.libro,
  planes: [{ titulo: seo.titulo, capitulo: seo.capitulo, titulo_capitulo: seo.titulo_capitulo, entregables: [
    { titulo: seo.pasos[1].titulo, origen: 'Cap. 7 · Paso 2', contenido: '# Palabras clave\n- keyword uno\n- keyword dos\n**Prioridad:** alta\n1. Primera acción' },
  ] }],
};
const b2 = await aBuffer(alumno);
writeFileSync(join(SITIO, 'tmp/prueba-mi-plan-seo.docx'), b2);
const ok = (b) => b.length > 2000 && b[0] === 0x50 && b[1] === 0x4b; // ZIP "PK"
console.log(`[docx] plan completo (ejemplo, ${ejemplo.planes.length} planes, ${ejemplo.planes.reduce((a, p) => a + p.entregables.length, 0)} entregables): ${(b1.length / 1024).toFixed(1)} KB ${ok(b1) ? 'OK' : 'FALLO'}`);
console.log(`[docx] mi plan SEO (alumno): ${(b2.length / 1024).toFixed(1)} KB ${ok(b2) ? 'OK' : 'FALLO'}`);
if (!ok(b1) || !ok(b2)) process.exitCode = 1;
