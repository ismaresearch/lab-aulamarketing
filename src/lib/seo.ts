import site from '../config/site.json';

export const SITE = site.url;
export function abs(path: string) {
  return new URL(path, SITE).toString();
}
export function recortar(s: string | null | undefined, n = 155): string {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  const c = t.slice(0, n - 1);
  return c.slice(0, c.lastIndexOf(' ') > 80 ? c.lastIndexOf(' ') : n - 1) + '…';
}
export const ORG = { '@type': 'Organization', '@id': `${site.web_principal}/#org`, name: 'aulamarketing.digital', url: site.web_principal };
export const LIBRO = {
  '@type': 'Book', '@id': `${SITE}/acerca/#libro`, name: site.libro.titulo, isbn: site.libro.isbn, sameAs: site.libro.doi,
  publisher: { '@type': 'Organization', name: site.libro.editorial }, datePublished: String(site.libro.anio), inLanguage: 'es-ES',
  author: site.libro.autores.map((n) => ({ '@type': 'Person', name: n })), license: site.libro.licencia_url,
};
export function breadcrumbLd(items: { nombre: string; url?: string }[]) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.nombre, ...(it.url ? { item: abs(it.url) } : {}) })),
  };
}
