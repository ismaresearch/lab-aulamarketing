import { abs } from '../lib/seo';
export function GET() {
  return new Response(`User-agent: *\nAllow: /\nDisallow: /mi-proyecto/\nDisallow: /mis-planes/\n\nSitemap: ${abs('/sitemap.xml')}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
