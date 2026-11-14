import { abs } from '../lib/seo';
// Sin Disallow: las páginas personales (mi-proyecto, mis-planes) llevan meta noindex,
// y Google solo puede leer ese noindex si se le permite rastrearlas.
export function GET() {
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${abs('/sitemap.xml')}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
