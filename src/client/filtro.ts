// Filtro genérico en cliente para listas (prompts, herramientas, glosario, planes).
// Contenedor: [data-js="filtro"]; controles: [data-filtro="<atributo>"] (texto → busca en data-texto);
// elementos: [data-js="item"] con data-<atributo>="valor1|valor2"; recuento: [data-js="recuento"].
function normal(s: string) {
  return (s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
document.querySelectorAll<HTMLElement>('[data-js="filtro"]').forEach((raiz) => {
  const controles = [...raiz.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-filtro]')];
  const items = [...raiz.querySelectorAll<HTMLElement>('[data-js="item"]')];
  const recuento = raiz.querySelector<HTMLElement>('[data-js="recuento"]');
  const vacio = raiz.querySelector<HTMLElement>('[data-js="vacio"]');
  const grupos = [...raiz.querySelectorAll<HTMLElement>('[data-js="grupo"]')];
  const singular = raiz.dataset.singular || 'resultado';
  const plural = raiz.dataset.plural || 'resultados';
  // valores iniciales desde la URL (?plan=seo&tipo=ia&q=keyword)
  const qs = new URLSearchParams(location.search);
  for (const c of controles) {
    const v = qs.get(c.dataset.filtro === 'texto' ? 'q' : c.dataset.filtro!);
    if (v != null) c.value = v;
  }
  const aplicar = () => {
    const activos = controles.map((c) => ({ k: c.dataset.filtro!, v: c.value.trim() })).filter((x) => x.v);
    let n = 0;
    for (const it of items) {
      const ok = activos.every(({ k, v }) =>
        k === 'texto' ? normal(it.dataset.texto || it.textContent || '').includes(normal(v)) : (it.dataset[k] || '').split('|').includes(v),
      );
      it.hidden = !ok;
      if (ok) n++;
    }
    grupos.forEach((g) => (g.hidden = !g.querySelector('[data-js="item"]:not([hidden])')));
    if (recuento) recuento.textContent = `${n} ${n === 1 ? singular : plural}`;
    if (vacio) {
      vacio.hidden = n > 0;
      const t = controles.find((c) => c.dataset.filtro === 'texto')?.value;
      const q = vacio.querySelector<HTMLElement>('[data-js="vacio-q"]');
      if (q) q.textContent = t ? `«${t}»` : 'nada con esos filtros';
    }
    const url = new URL(location.href);
    for (const c of controles) {
      const k = c.dataset.filtro === 'texto' ? 'q' : c.dataset.filtro!;
      if (c.value) url.searchParams.set(k, c.value); else url.searchParams.delete(k);
    }
    history.replaceState(null, '', url);
  };
  controles.forEach((c) => c.addEventListener('input', aplicar));
  raiz.querySelector('[data-js="limpiar"]')?.addEventListener('click', () => { controles.forEach((c) => (c.value = '')); aplicar(); });
  aplicar();
});
