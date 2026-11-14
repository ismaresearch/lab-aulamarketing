// Tarjeta de prompt: relleno de variables, copiar, abrir en IA y respuesta encadenada.
import providers from '../config/providers.json';
import { leer, guardar, suscribir, anunciar } from './estado';

type Seg = { t: 'txt'; v: string } | { t: 'var'; id: string; raw: string };
interface VarMeta { id: string; etiqueta: string; ambito: 'proyecto' | 'prompt' | 'salida_previa'; ejemplo_libro: string | null; tipo: string; opciones: string[] | null; fuente?: string | null; nota_ejemplo?: string | null }
interface Datos { id: string; segmentos: Seg[]; variables: VarMeta[]; origen_ids: string[]; origen_titulos: Record<string, string> }

const claveLocal = (prompt: string, v: string) => `@${prompt}.${v}`;

function valor(d: Datos, v: VarMeta): string {
  const e = leer();
  const local = e.proyecto[claveLocal(d.id, v.id)];
  if (v.ambito === 'salida_previa') {
    if (local && local.trim()) return local;
    const resp = (v.fuente ? [v.fuente] : d.origen_ids).map((id) => e.respuestas[id]?.texto?.trim()).filter(Boolean);
    return resp.join('\n\n');
  }
  if (e.modo === 'ejemplo') {
    if (v.ejemplo_libro) return v.ejemplo_libro;
    return v.ambito === 'prompt' ? (local || '') : '';
  }
  if (v.ambito === 'prompt') return local || e.proyecto[v.id] || '';
  const g = e.proyecto[v.id] || '';
  if (!g && (v.tipo === 'anio' || v.id === 'anio')) return String(new Date().getFullYear());
  return g;
}

export function componer(d: Datos): { texto: string; faltan: VarMeta[] } {
  const metas = new Map(d.variables.map((v) => [v.id, v]));
  const faltan: VarMeta[] = [];
  let texto = '';
  for (const s of d.segmentos) {
    if (s.t === 'txt') { texto += s.v; continue; }
    const m = metas.get(s.id);
    const val = m ? valor(d, m) : '';
    if (val) texto += val;
    else { texto += s.raw; if (m && !faltan.includes(m)) faltan.push(m); }
  }
  return { texto, faltan };
}

async function copiar(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(texto); return true; }
  } catch { /* fallback */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

function seleccionar(el: HTMLElement) {
  const r = document.createRange();
  r.selectNodeContents(el);
  const s = window.getSelection();
  s?.removeAllRanges();
  s?.addRange(r);
}

function urlProveedor(p: any, texto: string): { url: string; prellenado: boolean } {
  if (p.prellenado && p.parametro) {
    const enc = encodeURIComponent(texto);
    if (texto.length <= p.max_caracteres) return { url: `${p.url}?${p.parametro}=${enc}`, prellenado: true };
  }
  return { url: p.url, prellenado: false };
}

function iniciarTarjeta(card: HTMLElement) {
  const d: Datos = JSON.parse(card.querySelector('script[data-js="prompt-data"]')!.textContent || '{}');
  const body = card.querySelector<HTMLElement>('[data-js="prompt-body"]')!;
  const faltanEl = card.querySelector<HTMLElement>('[data-js="faltan"]')!;
  const confirmar = card.querySelector<HTMLElement>('[data-js="confirmar"]')!;
  const btnCopiar = card.querySelector<HTMLButtonElement>('[data-js="copiar"]')!;
  const abrir = [...card.querySelectorAll<HTMLAnchorElement>('[data-js="abrir"]')];
  const resp = card.querySelector<HTMLTextAreaElement>('[data-js="respuesta"]');
  const detVars = card.querySelector<HTMLDetailsElement>('[data-js="detalles-variables"]');

  function pintar() {
    const e = leer();
    const metas = new Map(d.variables.map((v) => [v.id, v]));
    body.querySelectorAll<HTMLElement>('[data-var]').forEach((span) => {
      const m = metas.get(span.dataset.var!);
      const val = m ? valor(d, m) : '';
      span.textContent = val || span.dataset.raw || '';
      span.dataset.estado = val ? 'llena' : 'vacia';
      span.title = val ? `${m?.etiqueta}` : `Falta: ${m?.etiqueta}`;
    });
    const { texto, faltan } = componer(d);
    faltanEl.dataset.estado = faltan.length ? 'faltan' : 'listo'; // P6: estilo del aviso dentro del bloque terminal
    if (faltan.length) {
      faltanEl.hidden = false;
      const sinEjemplo = e.modo === 'ejemplo' ? faltan.filter((f) => f.ambito === 'proyecto' && !f.ejemplo_libro) : [];
      const resto = faltan.filter((f) => !sinEjemplo.includes(f));
      const partes: string[] = [];
      if (sinEjemplo.length) partes.push(`El ejemplo del libro no incluye: ${sinEjemplo.map((f) => f.etiqueta).join(', ')} (se deja el hueco; cambia a «Mi proyecto» para rellenarlo).`);
      if (resto.length) partes.push(`Te ${resto.length === 1 ? 'falta 1 dato' : `faltan ${resto.length} datos`}: ${resto.map((f) => f.etiqueta).join(', ')}. Rellénalos o copia igualmente.`);
      faltanEl.textContent = partes.join(' ');
    } else {
      faltanEl.hidden = !d.variables.length ? true : false;
      faltanEl.textContent = d.variables.length ? (e.modo === 'ejemplo' ? 'Listo para usar con los datos del ejemplo del libro.' : 'Listo para usar con los datos de Mi proyecto.') : '';
    }
    for (const a of abrir) {
      const p = providers.proveedores.find((x) => x.id === a.dataset.proveedor);
      if (p) a.href = urlProveedor(p, texto).url;
    }
    // inputs de variables
    card.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-js="var-input"]').forEach((inp) => {
      const m = metas.get(inp.dataset.var!);
      if (!m || document.activeElement === inp) return;
      const local = e.proyecto[claveLocal(d.id, m.id)];
      const ro = e.modo === 'ejemplo' && m.ambito !== 'salida_previa' && (m.ambito === 'proyecto' || !!m.ejemplo_libro);
      inp.value = m.ambito === 'salida_previa' ? (local || '') : ro ? (valor(d, m) || '') : (m.ambito === 'prompt' ? (local || e.proyecto[m.id] || '') : (e.proyecto[m.id] || ''));
      (inp as HTMLInputElement).readOnly = ro;
      inp.setAttribute('aria-readonly', String(ro));
      const nota = card.querySelector<HTMLElement>(`[data-js="var-nota"][data-var="${CSS.escape(m.id)}"]`);
      if (nota) nota.hidden = !ro;
    });
    card.querySelectorAll<HTMLElement>('[data-js="salida-estado"]').forEach((el) => {
      const m = metas.get(el.dataset.var!);
      const tiene = m ? !!valor(d, m) : false;
      el.textContent = tiene ? 'Se usará la respuesta guardada del prompt anterior (puedes sustituirla aquí).' : 'Primero ejecuta el prompt anterior en tu IA y pega aquí su respuesta.';
    });
    if (resp && document.activeElement !== resp) resp.value = e.respuestas[d.id]?.texto || '';
  }

  async function hacerCopia(texto: string, mostrarOk = true) {
    const ok = await copiar(texto);
    if (ok) {
      if (mostrarOk) {
        const etiqueta = btnCopiar.querySelector<HTMLElement>('[data-js="copiar-txt"]') ?? btnCopiar; // conserva el icono (P6)
        const original = etiqueta.textContent;
        etiqueta.textContent = '✓ Copiado';
        btnCopiar.classList.add('c-btn--ok');
        anunciar('Prompt copiado al portapapeles');
        setTimeout(() => { etiqueta.textContent = original || 'Copiar prompt'; btnCopiar.classList.remove('c-btn--ok'); }, 2000);
      }
    } else {
      anunciar('No hemos podido copiar. Mantén pulsado el texto para seleccionarlo.');
      seleccionar(body);
    }
    return ok;
  }

  btnCopiar.addEventListener('click', () => {
    const { texto, faltan } = componer(d);
    if (faltan.length && confirmar.hidden) {
      confirmar.hidden = false;
      confirmar.querySelector<HTMLElement>('[data-js="confirmar-texto"]')!.textContent =
        `¿Copiar con huecos? El prompt llevará ${faltan.map((f) => f.etiqueta).slice(0, 3).join(', ')}${faltan.length > 3 ? '…' : ''} tal cual.`;
      confirmar.querySelector<HTMLButtonElement>('[data-js="copiar-igual"]')?.focus();
      return;
    }
    confirmar.hidden = true;
    hacerCopia(texto);
  });
  confirmar.querySelector('[data-js="copiar-igual"]')?.addEventListener('click', () => {
    confirmar.hidden = true;
    hacerCopia(componer(d).texto);
    btnCopiar.focus();
  });
  confirmar.querySelector('[data-js="rellenar"]')?.addEventListener('click', () => {
    confirmar.hidden = true;
    if (detVars) detVars.open = true;
    const primera = componer(d).faltan[0];
    const inp = primera && card.querySelector<HTMLElement>(`[data-js="var-input"][data-var="${CSS.escape(primera.id)}"]`);
    (inp as HTMLElement | null)?.focus();
  });

  for (const a of abrir) {
    a.addEventListener('click', () => {
      // SIEMPRE copiar primero; la navegación (target=_blank) continúa a continuación.
      const { texto } = componer(d);
      const p = providers.proveedores.find((x) => x.id === a.dataset.proveedor);
      const pre = p ? urlProveedor(p, texto).prellenado : false;
      hacerCopia(texto, false);
      anunciar(`Abriendo ${p?.nombre ?? 'la IA'} en una pestaña nueva… El prompt ya está en tu portapapeles${pre ? '' : ': pégalo con Ctrl/⌘+V'}.`);
    });
  }

  card.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-js="var-input"]').forEach((inp) => {
    inp.addEventListener('input', () => {
      if ((inp as HTMLInputElement).readOnly) return;
      const m = d.variables.find((v) => v.id === inp.dataset.var);
      if (!m) return;
      guardar((e) => {
        if (m.ambito === 'proyecto') e.proyecto[m.id] = inp.value;
        else e.proyecto[claveLocal(d.id, m.id)] = inp.value;
      });
    });
  });

  if (resp) {
    let t: number | undefined;
    const guardarResp = (avisar: boolean) => {
      guardar((e) => { e.respuestas[d.id] = { texto: resp.value, fecha: new Date().toISOString() }; });
      if (avisar) anunciar('Respuesta guardada en este navegador');
    };
    resp.addEventListener('input', () => { window.clearTimeout(t); t = window.setTimeout(() => guardarResp(false), 600); });
    card.querySelector('[data-js="guardar-respuesta"]')?.addEventListener('click', () => guardarResp(true));
  }
  card.querySelector('[data-js="expandir"]')?.addEventListener('click', (ev) => {
    const b = ev.currentTarget as HTMLButtonElement;
    const exp = body.dataset.expandido === 'true';
    body.dataset.expandido = String(!exp);
    b.textContent = exp ? 'Ver prompt completo' : 'Contraer';
    b.setAttribute('aria-expanded', String(!exp));
  });

  card.querySelector('[data-js="anatomia"]')?.addEventListener('click', (ev) => {
    const b = ev.currentTarget as HTMLButtonElement;
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    body.dataset.anatomia = String(on);
  });
  pintar();
  suscribir(pintar);
}

document.querySelectorAll<HTMLElement>('[data-js="prompt-card"]').forEach(iniciarTarjeta);
