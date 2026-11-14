// Estado del alumno en el navegador (localStorage), sin backend.
// Clave versionada; si localStorage no está disponible se trabaja en memoria y se avisa.
import site from '../config/site.json';

export const CLAVE = site.storage_key; // "lab-aulamarketing:v1"
export const VERSION = 1;

export interface EntregableAlumno { contenido: string; fecha: string; titulo?: string }
export interface Estado {
  version: number;
  modo: 'ejemplo' | 'proyecto';
  proyecto: Record<string, string>;
  respuestas: Record<string, { texto: string; fecha: string }>;
  entregables: Record<string, Record<string, EntregableAlumno>>; // plan → paso → entregable
  progreso: Record<string, Record<string, boolean>>; // plan → paso → visto/hecho
  prerrequisitos: Record<string, boolean>;
  ultima_copia: string | null;
  actualizado: string | null;
}

const vacio = (): Estado => ({
  version: VERSION, modo: 'ejemplo', proyecto: {}, respuestas: {}, entregables: {}, progreso: {}, prerrequisitos: {}, ultima_copia: null, actualizado: null,
});

let disponible = true;
let memoria: Estado | null = null;

function probar(): boolean {
  try {
    const k = '__lab_test__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}
disponible = typeof window !== 'undefined' && probar();

export function almacenamientoDisponible() {
  return disponible;
}

function normalizar(x: any): Estado {
  const b = vacio();
  if (!x || typeof x !== 'object') return b;
  return {
    ...b,
    ...x,
    version: VERSION,
    modo: x.modo === 'proyecto' ? 'proyecto' : 'ejemplo',
    proyecto: { ...(x.proyecto || {}) },
    respuestas: { ...(x.respuestas || {}) },
    entregables: { ...(x.entregables || {}) },
    progreso: { ...(x.progreso || {}) },
    prerrequisitos: { ...(x.prerrequisitos || {}) },
  };
}

export function leer(): Estado {
  if (memoria) return memoria;
  if (!disponible) return (memoria = vacio());
  try {
    const raw = window.localStorage.getItem(CLAVE);
    memoria = normalizar(raw ? JSON.parse(raw) : null);
  } catch {
    memoria = vacio();
  }
  return memoria;
}

const oyentes = new Set<(e: Estado) => void>();
export function suscribir(fn: (e: Estado) => void) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

export function guardar(mutar: (e: Estado) => void): boolean {
  const e = leer();
  mutar(e);
  e.actualizado = new Date().toISOString();
  let ok = true;
  if (disponible) {
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(e));
    } catch {
      ok = false;
      avisarNoDisponible('No hemos podido guardar (almacenamiento lleno o bloqueado). Descarga una copia para no perder tus datos.');
    }
  }
  oyentes.forEach((f) => f(e));
  return ok && disponible;
}

export function avisarNoDisponible(msg?: string) {
  document.querySelectorAll<HTMLElement>('[data-js="aviso-almacenamiento"]').forEach((el) => {
    el.hidden = false;
    if (msg) el.textContent = msg;
  });
}

// ---------- exportar / importar copia ----------
export function exportarCopia() {
  const e = leer();
  const datos = { app: 'lab.aulamarketing.digital', version: VERSION, exportado: new Date().toISOString(), datos: e };
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const nombre = `lab-aulamarketing-copia-${new Date().toISOString().slice(0, 10)}.json`;
  descargarBlob(blob, nombre);
  guardar((s) => (s.ultima_copia = new Date().toISOString()));
}

export async function importarCopia(file: File): Promise<string> {
  const txt = await file.text();
  let j: any;
  try {
    j = JSON.parse(txt);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  if (j?.app !== 'lab.aulamarketing.digital' || !j.datos) throw new Error('El archivo no es una copia de lab.aulamarketing.digital.');
  if (Number(j.version) > VERSION) throw new Error('La copia es de una versión más reciente del sitio.');
  const nuevo = normalizar(j.datos);
  memoria = nuevo;
  guardar(() => {});
  return `Copia cargada (${new Date(j.exportado).toLocaleString('es-ES')}).`;
}

export function borrarTodo() {
  memoria = vacio();
  if (disponible) {
    try {
      window.localStorage.removeItem(CLAVE);
    } catch {}
  }
  oyentes.forEach((f) => f(memoria!));
}

export function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ---------- anuncios accesibles ----------
let toastTimer: number | undefined;
export function anunciar(msg: string) {
  const live = document.getElementById('anuncios');
  if (live) {
    live.textContent = '';
    window.setTimeout(() => (live.textContent = msg), 30);
  }
  const t = document.getElementById('toast');
  if (t) {
    t.textContent = msg;
    t.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => (t.hidden = true), 2600);
  }
}

export function aplicarModo(modo: 'ejemplo' | 'proyecto') {
  document.documentElement.dataset.modo = modo;
  document.querySelectorAll<HTMLButtonElement>('[data-js="modo"] button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.modo === modo)));
}
