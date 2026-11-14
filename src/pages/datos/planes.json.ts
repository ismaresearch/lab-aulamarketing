// Datos mínimos para "Mis planes" (se cargan bajo demanda en esa página).
import { getPlanes } from '../../lib/datos';
export function GET() {
  const planes = getPlanes().map((p) => ({
    slug: p.slug, titulo: p.titulo, capitulo: p.capitulo, titulo_capitulo: p.titulo_capitulo, url: p.url, categoria: p.categoria,
    pasos: p.pasos.map((s) => ({ n: s.n, slug: s.slug, titulo: s.titulo, url: s.url })),
    entregables_libro: p.entregables.map((e) => {
      const paso = p.pasos.find((s) => s.url === e.paso);
      const c = e.figura?.contenido;
      return { id: e.id, titulo: e.titulo, texto: e.texto, paso_url: e.paso, paso_titulo: paso ? `Paso ${paso.n} · ${paso.titulo}` : null, tabla: c && Array.isArray(c.filas) ? { columnas: c.columnas || [], filas: c.filas } : null };
    }),
  }));
  return new Response(JSON.stringify({ version: 1, planes }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
