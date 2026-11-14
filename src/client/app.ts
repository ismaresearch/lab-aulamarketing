// Comportamiento global: selector de modo, aviso de almacenamiento, copia de seguridad,
// definiciones emergentes (Esc) y estado de progreso en listas de pasos.
import { leer, guardar, aplicarModo, almacenamientoDisponible, avisarNoDisponible, exportarCopia, importarCopia, anunciar, suscribir } from './estado';

function iniciarModo() {
  aplicarModo(leer().modo);
  document.querySelectorAll<HTMLElement>('[data-js="modo"]').forEach((grupo) => {
    grupo.addEventListener('click', (ev) => {
      const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-modo]');
      if (!b) return;
      const modo = b.dataset.modo === 'proyecto' ? 'proyecto' : 'ejemplo';
      guardar((e) => (e.modo = modo));
      aplicarModo(modo);
      anunciar(modo === 'proyecto' ? 'Modo Mi proyecto activado' : 'Modo Ejemplo del libro activado');
    });
  });
}

function iniciarCopias() {
  document.querySelectorAll<HTMLButtonElement>('[data-js="descargar-copia"]').forEach((b) =>
    b.addEventListener('click', () => {
      exportarCopia();
      anunciar('Copia descargada');
    }),
  );
  document.querySelectorAll<HTMLInputElement>('[data-js="cargar-copia"]').forEach((inp) =>
    inp.addEventListener('change', async () => {
      const f = inp.files?.[0];
      if (!f) return;
      if (!confirm('Cargar una copia sustituye los datos guardados en este navegador. ¿Continuar?')) { inp.value = ''; return; }
      try {
        const msg = await importarCopia(f);
        anunciar(msg);
        aplicarModo(leer().modo);
      } catch (e: any) {
        anunciar(e?.message || 'No se ha podido cargar la copia.');
      }
      inp.value = '';
    }),
  );
}

function iniciarTerminos() {
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    document.querySelectorAll<HTMLElement>('.c-term').forEach((t) => (t.dataset.cerrado = 'true'));
  });
  document.addEventListener('focusin', (ev) => {
    const t = (ev.target as HTMLElement).closest<HTMLElement>('.c-term');
    if (t) delete t.dataset.cerrado;
  });
  document.addEventListener('mouseover', (ev) => {
    const t = (ev.target as HTMLElement).closest<HTMLElement>('.c-term');
    if (t) delete t.dataset.cerrado;
  });
}

function pintarProgreso() {
  const e = leer();
  document.querySelectorAll<HTMLElement>('[data-js="estado-paso"]').forEach((el) => {
    const hecho = !!e.progreso[el.dataset.plan!]?.[el.dataset.paso!];
    el.textContent = hecho ? 'Completado ✓' : 'Sin empezar';
    el.classList.toggle('c-chip--ok', hecho); // conserva las clases de presentación (c-steps__estado…)
  });
  document.querySelectorAll<HTMLElement>('[data-js="progreso-plan"]').forEach((el) => {
    const plan = el.dataset.plan!;
    const total = Number(el.dataset.total || 0);
    const hechos = Object.values(e.progreso[plan] || {}).filter(Boolean).length;
    const pct = total ? Math.round((Math.min(hechos, total) / total) * 100) : 0;
    const barra = el.querySelector<HTMLElement>('[data-js="barra"]');
    const txt = el.querySelector<HTMLElement>('[data-js="texto"]');
    if (barra) barra.style.width = pct + '%';
    if (txt) txt.textContent = `${Math.min(hechos, total)} de ${total} pasos · ${pct} %`;
    el.setAttribute('aria-valuenow', String(pct));
  });
  // "Continúa donde lo dejaste" (inicio)
  const cont = document.querySelector<HTMLElement>('[data-js="continuar"]');
  if (cont) {
    const planes = JSON.parse(cont.dataset.planes || '[]') as { slug: string; titulo: string; url: string; total: number }[];
    const empezado = planes.find((p) => Object.values(e.progreso[p.slug] || {}).some(Boolean));
    if (empezado) {
      const hechos = Object.values(e.progreso[empezado.slug] || {}).filter(Boolean).length;
      cont.hidden = false;
      cont.querySelector<HTMLElement>('[data-js="continuar-titulo"]')!.textContent = empezado.titulo;
      cont.querySelector<HTMLElement>('[data-js="continuar-texto"]')!.textContent = `${hechos} de ${empezado.total} pasos`;
      cont.querySelector<HTMLAnchorElement>('[data-js="continuar-enlace"]')!.href = empezado.url;
    }
  }
}

function iniciarMarcarPaso() {
  document.querySelectorAll<HTMLButtonElement>('[data-js="marcar-paso"]').forEach((b) => {
    const { plan, paso } = b.dataset as { plan: string; paso: string };
    const pintar = () => {
      const hecho = !!leer().progreso[plan]?.[paso];
      b.setAttribute('aria-pressed', String(hecho));
      b.textContent = hecho ? '✓ Paso completado' : 'Marcar paso como completado';
    };
    pintar();
    b.addEventListener('click', () => {
      const hecho = !leer().progreso[plan]?.[paso];
      guardar((e) => ((e.progreso[plan] ||= {})[paso] = hecho));
      pintar();
      anunciar(hecho ? 'Paso marcado como completado' : 'Paso marcado como pendiente');
    });
  });
}

function iniciarPrerrequisitos() {
  document.querySelectorAll<HTMLButtonElement>('[data-js="prerrequisito-ok"]').forEach((b) => {
    const k = b.dataset.clave!;
    const caja = b.closest<HTMLElement>('[data-js="prerrequisitos"]');
    const pintar = () => { if (leer().prerrequisitos[k] && caja) caja.dataset.resuelto = 'true'; b.setAttribute('aria-pressed', String(!!leer().prerrequisitos[k])); };
    pintar();
    b.addEventListener('click', () => { guardar((e) => (e.prerrequisitos[k] = true)); pintar(); anunciar('Anotado: ya lo tienes.'); });
  });
}

function iniciar() {
  if (!almacenamientoDisponible()) avisarNoDisponible();
  if (!navigator.onLine) anunciar('Estás sin conexión. Puedes seguir leyendo; tus cambios se guardan en este navegador.');
  iniciarModo();
  iniciarCopias();
  iniciarTerminos();
  iniciarMarcarPaso();
  iniciarPrerrequisitos();
  pintarProgreso();
  suscribir(pintarProgreso);
}
iniciar();
