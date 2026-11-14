// llms.txt: resumen legible por asistentes de IA (AEO, cap. 7: entidades claras y respuestas directas).
import site from '../config/site.json';
import { getPlanes } from '../lib/datos';
import { abs } from '../lib/seo';
export function GET() {
  const l = site.libro;
  const lineas = [
    `# ${site.nombre}`,
    '',
    `> Laboratorio abierto y gratuito para construir un plan de marketing digital paso a paso, basado en el libro «${l.titulo}» (${l.editorial}, ${l.anio}; DOI ${l.doi}; licencia ${l.licencia}). Autores: ${l.autores.join(', ')}.`,
    '',
    '## Planes',
    ...getPlanes().map((p) => `- [${p.titulo}](${abs(p.url)}): ${p.promesa ?? p.titulo_capitulo}`),
    '',
    '## Recursos',
    `- [Biblioteca de prompts](${abs('/prompts/')})`,
    `- [Directorio de herramientas](${abs('/herramientas/')})`,
    `- [Glosario](${abs('/glosario/')})`,
    `- [Antes de empezar: conceptos de IA](${abs('/antes-de-empezar/')})`,
    `- [Acerca del libro](${abs('/acerca/')})`,
    '',
  ];
  return new Response(lineas.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
