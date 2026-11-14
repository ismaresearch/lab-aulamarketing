// Utilidades de presentación de texto literal (sin alterar el contenido).
export function parrafos(texto: string): { tipo: 'p' | 'bloque'; texto: string }[] {
  return (texto || '')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => ({ tipo: l.startsWith('✐') ? 'bloque' : 'p', texto: l }));
}
export type Pieza = { t: 'txt'; v: string } | { t: 'term'; v: string; slug: string; def: string };
/** Marca la primera aparición de cada término (de capas/glosario/deteccion.json). `usados` evita repetir en el mismo paso. */
export function marcarTerminos(texto: string, terminos: { termino: string; slug: string; definicion: string; mayusculas?: boolean }[], usados: Set<string>): Pieza[] {
  let piezas: Pieza[] = [{ t: 'txt', v: texto }];
  for (const term of terminos) {
    if (usados.has(term.slug) || !term.termino) continue;
    const out: Pieza[] = [];
    let hecho = false;
    for (const p of piezas) {
      if (hecho || p.t !== 'txt') { out.push(p); continue; }
      const i = term.mayusculas === false ? p.v.toLocaleLowerCase('es').indexOf(term.termino.toLocaleLowerCase('es')) : p.v.indexOf(term.termino);
      if (i < 0) { out.push(p); continue; }
      const antes = p.v[i - 1], despues = p.v[i + term.termino.length];
      if ((antes && /[\p{L}\p{N}]/u.test(antes)) || (despues && /[\p{L}\p{N}]/u.test(despues))) { out.push(p); continue; }
      if (i) out.push({ t: 'txt', v: p.v.slice(0, i) });
      out.push({ t: 'term', v: p.v.slice(i, i + term.termino.length), slug: term.slug, def: term.definicion });
      out.push({ t: 'txt', v: p.v.slice(i + term.termino.length) });
      hecho = true;
      usados.add(term.slug);
    }
    piezas = out;
  }
  return piezas;
}
export function pad2(n: number) { return String(n).padStart(2, '0'); }
