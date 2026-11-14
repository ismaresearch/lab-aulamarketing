// "Mis planes": entregables guardados por plan + exportación a Word (.docx).
// La maquetación vive en <template> de la página (capa de presentación); aquí solo se rellenan "slots".
import site from '../config/site.json';
import { leer, guardar, suscribir, anunciar, descargarBlob } from './estado';

interface PasoMin { n: number; slug: string; titulo: string; url: string }
interface EntLibro { id: string; titulo: string; texto: string; paso_url: string | null; paso_titulo: string | null; tabla: any | null }
interface PlanMin { slug: string; titulo: string; capitulo: number; titulo_capitulo: string; url: string; categoria: string; pasos: PasoMin[]; entregables_libro: EntLibro[] }

const raiz = document.querySelector<HTMLElement>('[data-js="mis-planes"]');

function slot(el: ParentNode, nombre: string) {
  return el.querySelector<HTMLElement>(`[data-slot="${nombre}"]`);
}
function clonar(id: string) {
  return (document.getElementById(id) as HTMLTemplateElement).content.firstElementChild!.cloneNode(true) as HTMLElement;
}

async function docx(entrada: any, nombre: string) {
  try {
    const { aBlob } = await import('../lib/docx-export.js');
    const blob = await aBlob(entrada);
    descargarBlob(blob, nombre);
    anunciar('Documento Word generado');
  } catch (e) {
    console.error(e);
    anunciar('No hemos podido generar el documento Word.');
  }
}

function entradaPlanes(planes: PlanMin[], modo: 'ejemplo' | 'proyecto', titulo: string) {
  const e = leer();
  const proyecto = modo === 'ejemplo' ? 'aulamarketing.digital' : e.proyecto.marca || e.proyecto.nombre_proyecto || 'Mi proyecto';
  return {
    proyecto, modo, titulo_documento: titulo, libro: site.libro,
    planes: planes.map((pl) => ({
      titulo: pl.titulo, capitulo: pl.capitulo, titulo_capitulo: pl.titulo_capitulo, url: site.url + pl.url,
      entregables: modo === 'ejemplo'
        ? pl.entregables_libro.map((x) => ({ titulo: x.titulo, origen: `Libro · cap. ${pl.capitulo}${x.paso_titulo ? ' · ' + x.paso_titulo : ''}`, contenido: x.texto, tabla: x.tabla }))
        : pl.pasos.filter((p) => e.entregables[pl.slug]?.[p.slug]?.contenido?.trim()).map((p) => {
            const it = e.entregables[pl.slug][p.slug];
            return { titulo: p.titulo, origen: `Cap. ${pl.capitulo} · Paso ${p.n} · ${new Date(it.fecha).toLocaleDateString('es-ES')}`, contenido: it.contenido };
          }),
    })),
  };
}
const nombreArchivo = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

async function iniciar() {
  if (!raiz) return;
  let planes: PlanMin[] = [];
  try {
    const r = await fetch('/datos/planes.json');
    planes = (await r.json()).planes;
  } catch {
    raiz.textContent = 'Algo no ha ido bien al cargar tus planes. Recarga la página.';
    return;
  }
  const lista = slot(raiz, 'lista')!;
  const vacio = slot(raiz, 'vacio')!;
  const completo = slot(raiz, 'completo')!;

  const pintar = () => {
    const e = leer();
    const modo = e.modo;
    lista.innerHTML = '';
    let conAlgo = 0;
    for (const pl of planes) {
      const guardados = pl.pasos.filter((p) => e.entregables[pl.slug]?.[p.slug]?.contenido?.trim());
      const hechos = Object.values(e.progreso[pl.slug] || {}).filter(Boolean).length;
      if (modo === 'proyecto' && !guardados.length && !hechos) continue;
      conAlgo++;
      const card = clonar('tpl-plan');
      slot(card, 'overline')!.textContent = `Capítulo ${String(pl.capitulo).padStart(2, '0')} · ${pl.categoria}`;
      const a = slot(card, 'titulo') as HTMLAnchorElement;
      a.textContent = pl.titulo;
      a.href = pl.url;
      slot(card, 'estado')!.textContent = modo === 'ejemplo'
        ? `${pl.entregables_libro.length} entregables del libro`
        : `${Math.min(hechos, pl.pasos.length)} de ${pl.pasos.length} pasos · ${guardados.length} ${guardados.length === 1 ? 'entregable guardado' : 'entregables guardados'}`;
      const cont = slot(card, 'entregables')!;
      const items = modo === 'ejemplo'
        ? pl.entregables_libro.map((x) => ({ titulo: x.titulo, origen: x.paso_titulo ? `Libro · ${x.paso_titulo}` : 'Libro', contenido: x.texto, editable: false, paso: '' }))
        : guardados.map((p) => ({ titulo: p.titulo, origen: `Paso ${p.n} · ${new Date(e.entregables[pl.slug][p.slug].fecha).toLocaleString('es-ES')}`, contenido: e.entregables[pl.slug][p.slug].contenido, editable: true, paso: p.slug }));
      if (!items.length) {
        const pVacio = document.createElement('p');
        pVacio.className = 'c-meta';
        pVacio.textContent = 'Aún no hay entregables guardados en este plan.';
        cont.appendChild(pVacio);
      }
      for (const it of items) {
        const en = clonar('tpl-entregable');
        slot(en, 'titulo')!.textContent = it.titulo;
        slot(en, 'origen')!.textContent = it.origen;
        const ta = slot(en, 'contenido') as HTMLTextAreaElement;
        ta.value = it.contenido;
        ta.readOnly = !it.editable;
        ta.setAttribute('aria-label', `Contenido de ${it.titulo}`);
        const quitar = slot(en, 'quitar') as HTMLButtonElement;
        const guardarB = slot(en, 'guardar') as HTMLButtonElement;
        if (!it.editable) { quitar.remove(); guardarB.remove(); }
        guardarB?.addEventListener('click', () => {
          guardar((s) => { s.entregables[pl.slug][it.paso] = { ...s.entregables[pl.slug][it.paso], contenido: ta.value, fecha: new Date().toISOString() }; });
          anunciar('Cambios guardados');
        });
        quitar?.addEventListener('click', () => {
          if (!confirm(`¿Quitar «${it.titulo}» de tu plan?`)) return;
          guardar((s) => { delete s.entregables[pl.slug][it.paso]; });
          anunciar('Entregable quitado');
        });
        slot(en, 'copiar')?.addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(ta.value); anunciar('Copiado al portapapeles'); } catch { ta.select(); anunciar('Selecciona el texto y cópialo'); }
        });
        cont.appendChild(en);
      }
      slot(card, 'descargar')?.addEventListener('click', () =>
        docx(entradaPlanes([pl], modo, pl.titulo), `${nombreArchivo(pl.titulo)}${modo === 'ejemplo' ? '-ejemplo-libro' : ''}.docx`));
      lista.appendChild(card);
    }
    vacio.hidden = conAlgo > 0;
    completo.hidden = conAlgo === 0;
    const ult = slot(raiz, 'ultima-copia');
    if (ult) ult.textContent = e.ultima_copia ? new Date(e.ultima_copia).toLocaleString('es-ES') : 'nunca';
  };
  slot(raiz, 'descargar-completo')?.addEventListener('click', () => {
    const e = leer();
    const sel = e.modo === 'ejemplo' ? planes : planes.filter((pl) => Object.keys(e.entregables[pl.slug] || {}).length);
    docx(entradaPlanes(sel, e.modo, 'Plan completo de marketing digital'), `plan-completo${e.modo === 'ejemplo' ? '-ejemplo-libro' : ''}.docx`);
  });
  pintar();
  suscribir(pintar);
}
iniciar();
