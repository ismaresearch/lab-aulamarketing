// P6 · Estados de presentación calculados a partir del estado local (localStorage) para la piel Stitch.
// Nada de cifras inventadas: todo sale de leer() (progreso, entregables, respuestas, proyecto) o de los datos de la página.
// Ganchos (solo lectura de estado, salvo los chips de filtro, que escriben en el <select> del filtro existente):
//   data-js="proyecto-nombre" · "paso-hecho" · "progreso-plan-pct" · "estado-plan" · "cta-plan" · "lista-pasos"
//   "cadena" (+ "nodo-cadena", "cadena-progreso") · "valor-var" · "anillo-proyecto" · "entregables-plan"
//   "chips-filtro" · "continuar" (barra, capítulo y siguiente paso).
import { leer, suscribir, type Estado } from './estado';

type PasoMin = { s: string; u: string; t?: string; n?: number };
const hechosDe = (e: Estado, plan: string) => e.progreso[plan] || {};
const nHechos = (e: Estado, plan: string, total: number) => Math.min(Object.values(hechosDe(e, plan)).filter(Boolean).length, total);
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const json = <T,>(s: string | undefined, def: T): T => { try { return s ? (JSON.parse(s) as T) : def; } catch { return def; } };
const $$ = <T extends HTMLElement = HTMLElement>(sel: string, raiz: ParentNode = document) => [...raiz.querySelectorAll<T>(sel)];

function nombreProyecto(e: Estado) {
  return (e.proyecto.marca || e.proyecto.nombre_proyecto || '').trim();
}

function pintar() {
  const e = leer();
  const ejemplo = e.modo === 'ejemplo';

  $$('[data-js="proyecto-nombre"]').forEach((el) => (el.textContent = nombreProyecto(e) || 'Mi proyecto (sin nombre todavía)'));

  $$('[data-js="paso-hecho"]').forEach((el) => {
    const hecho = !!hechosDe(e, el.dataset.plan!)[el.dataset.paso!];
    el.dataset.hecho = String(hecho);
    const t = el.querySelector<HTMLElement>('[data-js="paso-hecho-txt"]');
    if (t) t.textContent = hecho ? ' (completado)' : '';
  });

  $$('[data-js="progreso-plan-pct"]').forEach((el) => {
    const total = Number(el.dataset.total || 0);
    el.textContent = `${pct(nHechos(e, el.dataset.plan!, total), total)} %`;
  });

  $$('[data-js="estado-plan"]').forEach((el) => {
    const total = Number(el.dataset.total || 0);
    const h = nHechos(e, el.dataset.plan!, total);
    el.dataset.estado = h === 0 ? 'sin' : h >= total ? 'hecho' : 'curso';
    el.textContent = h === 0 ? 'Sin empezar' : h >= total ? `Completado · ${h} de ${total}` : `En curso · ${h} de ${total}`;
  });

  $$<HTMLAnchorElement>('[data-js="cta-plan"]').forEach((a) => {
    const plan = a.dataset.plan!;
    const pasos = json<PasoMin[]>(a.dataset.pasos, []);
    const h = nHechos(e, plan, pasos.length);
    const sig = pasos.find((p) => !hechosDe(e, plan)[p.s]);
    const txt = a.querySelector<HTMLElement>('[data-js="cta-txt"]');
    if (h === 0) { if (txt) txt.textContent = a.dataset.textoInicio || 'Empezar el plan'; if (pasos[0]) a.href = pasos[0].u; }
    else if (sig) { if (txt) txt.textContent = `Continuar (paso ${sig.n ?? pasos.indexOf(sig) + 1})`; a.href = sig.u; }
    else { if (txt) txt.textContent = 'Revisar el plan'; a.href = a.dataset.portada || a.href; }
    a.dataset.estado = h === 0 ? 'sin' : sig ? 'curso' : 'hecho';
  });

  $$('[data-js="lista-pasos"]').forEach((lista) => {
    const plan = lista.dataset.plan!;
    let marcado = false;
    $$('[data-paso-item]', lista).forEach((li) => {
      const hecho = !!hechosDe(e, plan)[li.dataset.pasoItem!];
      li.dataset.hecho = String(hecho);
      const sig = !hecho && !marcado;
      if (sig) marcado = true;
      li.dataset.siguiente = String(sig && Object.values(hechosDe(e, plan)).some(Boolean));
    });
  });

  $$('[data-js="cadena"]').forEach((cad) => {
    const nodos = $$('[data-js="nodo-cadena"]', cad).filter((n) => n.dataset.prompt);
    let actual = false;
    let hechos = 0;
    nodos.forEach((n) => {
      const hecho = !!e.respuestas[n.dataset.prompt!]?.texto?.trim();
      if (hecho) hechos++;
      const est = hecho ? 'hecho' : !actual ? 'actual' : 'pendiente';
      if (!hecho && !actual) actual = true;
      n.dataset.estado = est;
      const t = n.querySelector<HTMLElement>('[data-js="nodo-estado"]');
      if (t) t.textContent = est === 'hecho' ? 'Respuesta guardada' : est === 'actual' ? 'Siguiente' : 'Pendiente';
    });
    $$('[data-js="cadena-progreso"]', document).forEach((p) => {
      if (p.dataset.cadena !== cad.dataset.cadena) return;
      const b = p.querySelector<HTMLElement>('[data-js="barra"]');
      const t = p.querySelector<HTMLElement>('[data-js="texto"]');
      const n = nodos.length;
      if (b) b.style.width = pct(hechos, n) + '%';
      if (t) t.textContent = `${hechos} de ${n} prompts con respuesta guardada`;
      const pc = p.querySelector<HTMLElement>('[data-js="pct"]');
      if (pc) pc.textContent = `${pct(hechos, n)} %`;
      p.setAttribute('aria-valuenow', String(pct(hechos, n)));
    });
  });

  $$('[data-js="valor-var"]').forEach((el) => {
    const id = el.dataset.var!;
    let val = ejemplo ? (el.dataset.ejemplo || '') : (e.proyecto[id] || '').trim();
    if (!val && !ejemplo && id === 'anio') val = String(new Date().getFullYear()); // mismo valor por defecto que prompt-card.ts
    el.dataset.estado = val ? 'llena' : 'vacia';
    el.textContent = val || (ejemplo ? 'El ejemplo del libro no da este dato' : el.dataset.vacio || 'Falta: rellénalo en Mi proyecto');
  });

  $$('[data-js="anillo-proyecto"]').forEach((el) => {
    const ids = json<string[]>(el.dataset.esenciales, []);
    const llenos = ids.filter((id) => (e.proyecto[id] || '').trim()).length;
    const p = pct(llenos, ids.length);
    el.style.setProperty('--pct', String(p));
    el.setAttribute('aria-valuenow', String(p));
    const t = el.querySelector<HTMLElement>('[data-js="anillo-txt"]');
    if (t) t.textContent = `${p} %`;
    const s = el.querySelector<HTMLElement>('[data-js="anillo-sub"]');
    if (s) s.textContent = `${llenos}/${ids.length}`;
  });

  $$('[data-js="entregables-plan"]').forEach((el) => {
    const plan = el.dataset.plan;
    const n = plan
      ? Object.values(e.entregables[plan] || {}).filter((x) => x?.contenido?.trim()).length
      : Object.values(e.entregables).reduce((a, p) => a + Object.values(p || {}).filter((x) => x?.contenido?.trim()).length, 0);
    el.textContent = n === 0 ? 'Aún no has guardado entregables' : `${n} ${n === 1 ? 'entregable guardado' : 'entregables guardados'} en este navegador`;
  });

  const cont = document.querySelector<HTMLElement>('[data-js="continuar"]');
  if (cont) {
    const planes = json<{ slug: string; total: number; capitulo?: number; pasos?: PasoMin[] }[]>(cont.dataset.planes, []);
    const emp = planes.find((p) => Object.values(e.progreso[p.slug] || {}).some(Boolean));
    if (emp) {
      const h = nHechos(e, emp.slug, emp.total);
      const b = cont.querySelector<HTMLElement>('[data-js="continuar-barra"]');
      if (b) b.style.width = pct(h, emp.total) + '%';
      const pc = cont.querySelector<HTMLElement>('[data-js="continuar-pct"]');
      if (pc) pc.textContent = `${pct(h, emp.total)} %`;
      const cap = cont.querySelector<HTMLElement>('[data-js="continuar-cap"]');
      if (cap && emp.capitulo) cap.textContent = `Capítulo ${String(emp.capitulo).padStart(2, '0')}`;
      const sig = emp.pasos?.find((p) => !hechosDe(e, emp.slug)[p.s]);
      const a = cont.querySelector<HTMLAnchorElement>('[data-js="continuar-enlace"]');
      if (a && sig) a.href = sig.u;
    }
  }
}

function iniciarChips() {
  $$('[data-js="chips-filtro"]').forEach((grupo) => {
    const raiz = grupo.closest<HTMLElement>('[data-js="filtro"]') || document;
    const sel = raiz.querySelector<HTMLSelectElement | HTMLInputElement>(`[data-filtro="${grupo.dataset.para}"]`);
    if (!sel) return;
    const botones = $$<HTMLButtonElement>('button[data-valor]', grupo);
    const sync = () => botones.forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.valor || '') === sel.value)));
    botones.forEach((b) => b.addEventListener('click', () => {
      sel.value = b.dataset.valor || '';
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      sync();
    }));
    sel.addEventListener('input', sync);
    raiz.querySelector('[data-js="limpiar"]')?.addEventListener('click', () => setTimeout(sync, 0));
    setTimeout(sync, 0); // después de que filtro.ts lea los parámetros de la URL
  });
}

pintar();
suscribir(pintar);
iniciarChips();
