import { getPlanes, getPrompts, getHerramientas, getTerminos } from '../lib/datos';
import { abs } from '../lib/seo';
export function GET() {
  const urls: string[] = ['/', '/planes/', '/prompts/', '/herramientas/', '/glosario/', '/antes-de-empezar/', '/acerca/', '/laboratorio-visual/'];
  for (const p of getPlanes()) {
    urls.push(p.url, ...p.pasos.map((s) => s.url), ...p.cadenas.map((c) => c.url));
  }
  urls.push(...getPrompts().filter((p) => !p.es_propuesta).map((p) => `/prompts/${p.id}/`)); // propuestas pendientes de revisión: noindex, fuera del sitemap
  urls.push(...getHerramientas().map((h) => `/herramientas/${h.slug}/`));
  urls.push(...getTerminos().map((t) => `/glosario/${t.slug}/`));
  const hoy = new Date().toISOString().slice(0, 10);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...new Set(urls)].map((u) => `  <url><loc>${abs(u)}</loc><lastmod>${hoy}</lastmod></url>`).join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
