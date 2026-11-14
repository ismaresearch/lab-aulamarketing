/**
 * ÚNICO módulo de datos del sitio.
 *
 * Orden de aplicación (ARQUITECTURA.md):
 *  1. extraccion/ (literal, inmutable)
 *  2. capas/correcciones/correcciones.json  (parches exactos; se conserva `_original`)
 *  3. capas/herramientas/visibilidad.json   (mostrar:false → no aparece; nombre_mostrar)
 *  4. capas/prompts, capas/resumenes, capas/glosario, capas/planes (unión por ID)
 *  5. Si falta una pieza → marcador visible "[pendiente: …]" (ver PENDIENTE()).
 *
 * Todo se calcula en tiempo de build; los componentes solo reciben props ya resueltas.
 */
import { slugify, norm, pad2 } from './slug';
import fallbackVars from '../config/variables-fallback.json';

// ---------------------------------------------------------------- carga bruta
const RAW = import.meta.glob('../data/**/*.json', { eager: true, import: 'default' }) as Record<string, any>;
const P = '../data/';
function file(path: string): any | undefined {
  return RAW[P + path];
}
function filesUnder(prefix: string): [string, any][] {
  return Object.entries(RAW)
    .filter(([k]) => k.startsWith(P + prefix))
    .map(([k, v]) => [k.slice(P.length), v] as [string, any])
    .sort(([a], [b]) => a.localeCompare(b));
}
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
function asList(x: any, ...keys: string[]): any[] {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  for (const k of keys) if (Array.isArray(x[k])) return x[k];
  // diccionario {id: {...}}
  if (typeof x === 'object') {
    const vals = Object.entries(x).filter(([k, v]) => !k.startsWith('_') && v && typeof v === 'object' && !Array.isArray(v));
    if (vals.length) return vals.map(([k, v]: any) => ({ id: k, ...v }));
  }
  return [];
}

// ---------------------------------------------------------------- registro de build
export const registro: string[] = [];
function log(msg: string) {
  registro.push(msg);
}

/** Texto de marcador visible. ÚNICO punto donde se formatean los "[pendiente: …]". */
export function PENDIENTE(que: string): string {
  return `[pendiente: ${que}]`;
}

// ---------------------------------------------------------------- tipos
export type Segmento = { t: 'txt'; v: string; parte?: string | null } | { t: 'var'; id: string; raw: string; parte?: string | null };
export interface Variable {
  id: string;
  etiqueta: string;
  ayuda: string | null;
  tipo: string; // texto | texto_largo | opciones | anio
  opciones: string[] | null;
  ejemplo_libro: string | null;
  ambito: 'proyecto' | 'prompt' | 'salida_previa';
  usos: number;
  nivel: string | null; // obligatoria_inicio | bajo_demanda (variables de perfil)
  fuente: string | null; // id del prompt cuya respuesta alimenta esta entrada
  modo: string | null; // pegar | misma_conversacion | adjuntar | elegir
  sugerencias: string[]; // sugerencias_rapidas (botones que insertan/añaden texto)
  origen_ejemplo: string | null; // caso_aulamarketing | derivado_del_caso | ejemplo_del_marcador | propuesta_del_libro | null
  nota_ejemplo: string | null; // nota visible en modo Ejemplo (p. ej. «Propuesta del libro, no definitiva»)
  obligatoria: boolean; // nivel === 'obligatoria_inicio' → cuenta en «datos esenciales»
}
export interface Prompt {
  id: string;
  capitulo: number;
  n: number;
  id_seccion: string;
  titulo: string;
  texto_literal: string;
  segmentos: Segmento[];
  variables: string[];
  ias: string[];
  pagina_libro: number | null;
  origen: 'texto' | 'imagen' | string;
  contexto_previo: string | null;
  contexto_posterior: string | null;
  salida_libro: string | null;
  origen_ids: string[];
  misma_conversacion: string[];
  ias_libro: string[];
  copiable: boolean;
  nota: string | null;
  tipo: string;
  anatomia: boolean;
  nota_cadena: string | null;
  bloque: string | null;
  de_capa: boolean; // true si viene de capas/prompts/prompts.json
  propuesta: string | null; // id del prompt propuesto por la plataforma para este prompt descrito (campo propuesta_plataforma)
  es_propuesta: boolean; // true si es un prompt de prompts_propuestos (redactado por la plataforma)
  basado_en: string | null; // prompt del libro en que se basa la propuesta
  cita_libro: string | null; // cita literal del libro que justifica la propuesta
  aviso: string | null; // aviso de la propuesta («Prompt redactado por la plataforma…»)
  estado_revision: string | null; // pendiente | revisado
  plan: string | null; // slug del plan (o 'antes-de-empezar')
  paso_url: string | null;
}
export interface Herramienta {
  id: string;
  slug: string;
  nombre: string;
  nombre_libro: string;
  descripcion: string | null;
  tipo: 'ia' | 'digital';
  en_kit: boolean;
  pagina_kit: number | null;
  bloques: string[];
  capitulos: number[];
  menciones: { capitulo: number; id_seccion: string; bloque: string | null; descripcion: string | null; pagina_libro: number | null }[];
  url: string | null;
  url_fuente: string | null;
  usos: { plan: string; plan_titulo: string; paso: string; paso_titulo: string; url: string }[];
  nota: string | null;
}
export interface ToolRef { nombre: string; slug: string | null; tipo: 'ia' | 'digital' | null; descripcion: string | null }
export interface Definicion { id: string; termino: string; definicion: string; pagina_libro: number | null; slug: string | null }
export interface Figura { id: string; tipo: string; numero: string; titulo: string; pagina_libro: any; contenido: any; origen: string }
export interface Entregable { id: string; titulo: string; texto: string; pagina_libro: number | null; figura: Figura | null; capitulo: number; plan: string | null; paso: string | null }
export interface Video { id: string; tipo: 'vídeo' | 'artículo'; mostrar: string; herramientas: string | null; cita: string | null; pagina_libro: string | null }
export interface Paso {
  n: number;
  slug: string;
  url: string;
  id_seccion: string;
  titulo: string;
  numero_libro: string;
  pagina_libro: number | null;
  idea_clave: string | null;
  resumen: string | null;
  minutos: number | null;
  texto: { titulo: string | null; numero: string | null; texto: string; resumen: string | null }[];
  prompts: Prompt[];
  herramientas: ToolRef[];
  definiciones: Definicion[];
  figuras: Figura[];
  entregables: Entregable[];
  salidas_libro: { prompt: string; texto: string }[];
  videos: Video[];
  terminos: { termino: string; slug: string; definicion: string; mayusculas: boolean }[]; // de capas/glosario/deteccion.json
  es_ejemplo: boolean;
}
export interface Cadena {
  id: string;
  slug: string;
  titulo: string;
  descripcion: string | null;
  derivada: boolean;
  nodos: { tipo: 'prompt' | 'otro'; prompt: string | null; titulo: string; nota: string | null; produce: string | null; consume: string[] }[];
  plan: string;
  url: string;
}
export interface Prerrequisito { plan: string; plan_titulo: string; plan_url: string; que_aporta: string; alternativa_rapida: string }
export interface Plan {
  id: string;
  slug: string;
  url: string;
  titulo: string;
  capitulo: number;
  titulo_capitulo: string;
  parte: string | null;
  categoria: string;
  objetivos_meta: string[];
  promesa: string | null;
  al_terminar: string[];
  historia_ana: string | null;
  resumen_capitulo: string | null;
  objetivos_aprendizaje: string[];
  autoria: string | null;
  pasos: Paso[];
  entregables: Entregable[];
  prerrequisitos: Prerrequisito[];
  prompts: Prompt[];
  cadenas: Cadena[];
  minutos: number | null;
}
export interface Termino { slug: string; termino: string; corta: string | null; variantes: string[]; relacionados: string[]; definiciones: { texto: string; termino_libro: string | null; capitulo: number; id_seccion: string | null; pagina_libro: number | null; plan: string | null; paso_url: string | null }[] }

// ---------------------------------------------------------------- 1. extracción
const capsRaw: any[] = [];
for (let i = 1; i <= 16; i++) {
  const c = file(`extraccion/cap${pad2(i)}.json`);
  if (!c) throw new Error(`[datos] Falta extraccion/cap${pad2(i)}.json`);
  capsRaw.push(clone(c));
}
const kitRaw = clone(file('extraccion/kit_herramientas.json') || { lista_herramientas_digitales: [], lista_herramientas_ia: [] });
const referencias: any[] = clone(file('extraccion/referencias.json') || []);

// índice de objetos con id (para correcciones y búsquedas)
const porId = new Map<string, any>();
function indexar(o: any) {
  if (Array.isArray(o)) return o.forEach(indexar);
  if (o && typeof o === 'object') {
    if (typeof o.id === 'string' && !porId.has(o.id)) porId.set(o.id, o);
    for (const v of Object.values(o)) if (v && typeof v === 'object') indexar(v);
  }
}
capsRaw.forEach(indexar);
indexar(kitRaw);
indexar(referencias);

// ---------------------------------------------------------------- 2. correcciones
const corrFile = file('capas/correcciones/correcciones.json');
export const capas = {
  correcciones: !!corrFile,
  visibilidad: !!file('capas/herramientas/visibilidad.json'),
  prompts: !!file('capas/prompts/prompts.json'),
  variables: !!file('capas/prompts/variables.json'),
  cadenas: !!file('capas/prompts/cadenas.json'),
  resumenes: filesUnder('capas/resumenes/').length > 0,
  glosario: filesUnder('capas/glosario/').some(([k]) => !k.endsWith('deteccion.json')),
  deteccion: !!file('capas/glosario/deteccion.json'),
  planes: !!file('capas/planes/planes.json'),
};
let corrAplicadas = 0;
const capPorArchivo = new Map<string, any>(capsRaw.map((c) => [`cap${pad2(c.numero)}.json`, c]));
capPorArchivo.set('kit_herramientas.json', kitRaw);
capPorArchivo.set('referencias.json', referencias);
/** Resuelve una ruta tipo "secciones[1].subsecciones[0].texto" → [contenedor, clave]. */
function resolverRuta(raiz: any, ruta: string): [any, string | number] | null {
  const partes: (string | number)[] = [];
  for (const m of ruta.matchAll(/([^.[\]]+)|\[(\d+)\]/g)) partes.push(m[2] !== undefined ? Number(m[2]) : m[1]);
  if (!partes.length) return null;
  let cont = raiz;
  for (const k of partes.slice(0, -1)) { cont = cont?.[k as any]; if (cont == null) return null; }
  return [cont, partes[partes.length - 1]];
}
const corrIgnoradas: string[] = [];
const corrNoAplicables: string[] = [];
for (const c of asList(corrFile, 'parches', 'correcciones')) {
  const original: string | undefined = c.original ?? c.texto_original ?? c.de;
  const nuevo: string | undefined = c.corregido ?? c.correccion ?? c.nuevo ?? c.a ?? c.sustituto;
  let destino: [any, string | number] | null = null;
  let dueño: any = null;
  if (c.archivo && !capPorArchivo.has(c.archivo)) {
    corrNoAplicables.push(`${c.id ?? '?'} ${c.archivo}#${c.ruta}`); // el sitio no carga indice.json (construye su índice desde capNN.json)
    continue;
  }
  if (c.archivo && c.ruta && capPorArchivo.has(c.archivo)) {
    destino = resolverRuta(capPorArchivo.get(c.archivo), c.ruta);
    dueño = c.id_elemento ? porId.get(c.id_elemento) : null;
  } else {
    const obj = porId.get(c.id_elemento ?? c.id ?? c.ref);
    if (obj) { destino = resolverRuta(obj, c.campo ?? c.field ?? 'texto'); dueño = obj; }
  }
  const val = destino ? destino[0]?.[destino[1] as any] : undefined;
  if (!destino || typeof original !== 'string' || typeof nuevo !== 'string' || typeof val !== 'string' || !val.includes(original)) {
    corrIgnoradas.push(`${c.id ?? '?'} ${c.archivo ?? ''}#${c.ruta ?? c.campo ?? ''} «${String(original).slice(0, 40)}»`);
    continue;
  }
  destino[0][destino[1] as any] = val.replace(original, nuevo);
  const reg = dueño ?? destino[0];
  if (reg && typeof reg === 'object' && !Array.isArray(reg)) {
    reg._original = reg._original || {};
    const k = String(c.ruta ?? destino[1]);
    if (!(k in reg._original)) reg._original[k] = val;
  }
  corrAplicadas++;
}
if (corrIgnoradas.length) log(`correcciones ignoradas (el fragmento no encaja): ${corrIgnoradas.length} → ${corrIgnoradas.slice(0, 10).join(' | ')}${corrIgnoradas.length > 10 ? ' …' : ''}`);
if (corrNoAplicables.length) log(`correcciones no aplicables (archivo que el sitio no usa): ${corrNoAplicables.length} → ${corrNoAplicables.join(' | ')}`);
if (corrFile) log(`correcciones aplicadas: ${corrAplicadas}`);

// ---------------------------------------------------------------- 3. visibilidad de herramientas
const visRaw = file('capas/herramientas/visibilidad.json');
const vis = new Map<string, any>();
for (const v of asList(visRaw, 'herramientas', 'visibilidad')) if (v?.id) vis.set(v.id, v);
const estadoHerr = new Map<string, any>((file('investigacion/estado_herramientas.json') || []).map((e: any) => [e.id, e]));
function visible(id: string): boolean {
  const v = vis.get(id);
  return !(v && v.mostrar === false);
}
function nombreVis(id: string, nombre: string): string {
  const v = vis.get(id);
  return (v && (v.nombre_mostrar || v.nombre_actual)) || nombre;
}

// ---------------------------------------------------------------- capas varias
const resumenPorCap = new Map<string, any>();
const resumenPorSeccion = new Map<string, any>();
for (const [, r] of filesUnder('capas/resumenes/')) {
  for (const item of Array.isArray(r) ? r : [r]) {
    if (item?.id && /^c\d\d$/.test(item.id)) resumenPorCap.set(item.id, item);
    for (const ap of asList(item?.apartados, 'apartados')) if (ap?.id) resumenPorSeccion.set(ap.id, ap);
    const secs = item?.secciones;
    if (secs && typeof secs === 'object') {
      for (const [sid, s] of Object.entries<any>(secs)) {
        resumenPorSeccion.set(sid, s);
        for (const [subid, sub] of Object.entries<any>(s?.subsecciones || {})) {
          resumenPorSeccion.set(subid, sub);
          for (const [aid, ap] of Object.entries<any>(sub?.apartados || {})) resumenPorSeccion.set(aid, ap);
        }
      }
    }
  }
}
const ideaDe = (s: any) => s?.idea_clave ?? s?.tarjeta ?? s?.frase ?? null;
const resumenDe = (s: any) => s?.resumen ?? null;

// ---------------------------------------------------------------- planes (capa P4)
const planesFile = file('capas/planes/planes.json');
if (!planesFile) log('capas/planes/planes.json no existe: planes derivados de los capítulos');
const planesDef: any[] = planesFile?.planes ?? capsRaw
  .filter((c) => c.numero !== 4 && c.numero !== 16)
  .map((c) => ({ id: slugify(c.titulo, 30), slug: slugify(c.titulo, 30), titulo: c.titulo, capitulo_origen: c.numero, categoria: 'Estrategia', objetivos_meta: [], pasos: c.secciones.map((s: any) => ({ id_seccion: s.id, titulo: s.titulo })), entregables: [], prerrequisitos_suaves: [], prompts: c.prompts.map((p: any) => p.id), cadenas: [] }));
export const categorias: string[] = planesFile?.categorias ?? ['Estrategia', 'Medios propios', 'Medios pagados', 'Medios ganados', 'Medición'];
export const objetivosInicio: { id: string; etiqueta: string; planes: string[] }[] = planesFile?.objetivos ?? [];
const planDeCap = new Map<number, any>();
for (const p of planesDef) planDeCap.set(p.capitulo_origen, p);
const ANTES = { slug: 'antes-de-empezar', titulo: 'Antes de empezar', url: '/antes-de-empezar/' };
function planSlugDeCap(cap: number): string | null {
  if (cap === 4) return ANTES.slug;
  return planDeCap.get(cap)?.slug ?? null;
}

// ---------------------------------------------------------------- utilidades de sección
const capPorId = new Map<string, any>(capsRaw.map((c) => [c.id, c]));
const enSeccion = (idElemento: string | null | undefined, sid: string) =>
  !!idElemento && (idElemento === sid || idElemento.startsWith(sid + '.'));
function pagina(x: any): number | null {
  if (x == null) return null;
  if (Array.isArray(x)) return typeof x[0] === 'number' ? x[0] : null;
  return typeof x === 'number' ? x : Number.parseInt(String(x), 10) || null;
}
function buscarSeccion(sid: string): { cap: any; sec: any; sub: any | null; apt: any | null } | null {
  const cap = capPorId.get(sid.slice(0, 3));
  if (!cap) return null;
  for (const s of cap.secciones) {
    if (s.id === sid) return { cap, sec: s, sub: null, apt: null };
    for (const sub of s.subsecciones || []) {
      if (sub.id === sid) return { cap, sec: s, sub, apt: null };
      for (const apt of sub.apartados || []) if (apt.id === sid) return { cap, sec: s, sub, apt };
    }
  }
  return null;
}

// ---------------------------------------------------------------- 4a. variables
const varsFile = file('capas/prompts/variables.json');
const variables = new Map<string, Variable>();
const marcadorAVar = new Map<string, string>();
function addVar(v: Partial<Variable> & { id: string }) {
  if (variables.has(v.id)) return variables.get(v.id)!;
  const full: Variable = {
    id: v.id,
    etiqueta: v.etiqueta || v.id,
    ayuda: v.ayuda ?? null,
    tipo: v.tipo || 'texto',
    opciones: v.opciones ?? null,
    ejemplo_libro: v.ejemplo_libro ?? null,
    ambito: v.ambito || 'prompt',
    usos: 0,
    nivel: v.nivel ?? null,
    fuente: v.fuente ?? null,
    modo: v.modo ?? null,
    sugerencias: v.sugerencias ?? [],
    origen_ejemplo: v.origen_ejemplo ?? null,
    nota_ejemplo: v.nota_ejemplo ?? null,
    obligatoria: v.nivel === 'obligatoria_inicio',
  };
  variables.set(v.id, full);
  return full;
}
if (varsFile) {
  for (const v of asList(varsFile, 'variables')) {
    const id = v.id ?? v.clave ?? v.nombre;
    if (!id) continue;
    const ambitoRaw = String(v.ambito ?? v.tipo_variable ?? v.origen ?? '').toLowerCase();
    const ambito: Variable['ambito'] = /salida|respuesta|previa|cadena/.test(ambitoRaw) || v.es_salida_previa
      ? 'salida_previa'
      : /prompt|local/.test(ambitoRaw) ? 'prompt' : 'proyecto'; // P2: variables.json solo contiene variables de PERFIL
    addVar({
      id,
      etiqueta: v.etiqueta ?? v.label ?? v.nombre_visible ?? v.nombre ?? id,
      ayuda: [v.pregunta_al_alumno, v.ayuda ?? v.descripcion ?? v.placeholder].filter(Boolean).join(' ') || null,
      tipo: v.tipo_campo ?? (Array.isArray(v.opciones) ? 'opciones' : v.tipo && /texto|opciones|anio|largo/.test(v.tipo) ? v.tipo : 'texto'),
      opciones: Array.isArray(v.opciones) ? v.opciones : null,
      ejemplo_libro: v.ejemplo_libro ?? v.ejemplo ?? v.valor_ejemplo ?? null,
      ambito,
      nivel: v.nivel ?? null,
      sugerencias: Array.isArray(v.sugerencias_rapidas) ? v.sugerencias_rapidas.filter((x: any) => typeof x === 'string' && x.trim()) : [],
      origen_ejemplo: v.origen_ejemplo ?? null,
      nota_ejemplo: v.origen_ejemplo === 'propuesta_del_libro' || v.estado_ejemplo === 'propuesta_no_definitiva' ? 'Propuesta del libro, no definitiva' : null,
    });
    for (const m of v.marcadores ?? v.marcadores_originales ?? []) marcadorAVar.set(m, id);
  }
} else {
  log('capas/prompts/variables.json no existe: se usan variables provisionales (config/variables-fallback.json)');
  for (const c of fallbackVars.campos_proyecto as any[]) addVar({ ...c, ambito: 'proyecto' });
  for (const [m, id] of Object.entries(fallbackVars.marcadores)) marcadorAVar.set(m, id as string);
}
const reSalidaPrevia = new RegExp(fallbackVars.patron_salida_previa, 'i');

// ---------------------------------------------------------------- 4b. prompts
const promptsCapa = new Map<string, any>();
for (const p of asList(file('capas/prompts/prompts.json'), 'prompts')) if (p?.id) promptsCapa.set(p.id, p);
if (!capas.prompts) log('capas/prompts/prompts.json no existe: tarjetas con el texto literal del libro');

function escRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function segmentarLiteral(texto: string, marcadores: string[]): { seg: Segmento[]; vars: string[] } {
  const ms = [...new Set(marcadores.filter((m) => m && texto.includes(m)))].sort((a, b) => b.length - a.length);
  if (!ms.length) return { seg: [{ t: 'txt', v: texto }], vars: [] };
  const re = new RegExp('(' + ms.map(escRe).join('|') + ')', 'g');
  const seg: Segmento[] = [];
  const vars: string[] = [];
  for (const parte of texto.split(re)) {
    if (!parte) continue;
    if (ms.includes(parte)) {
      let id = marcadorAVar.get(parte);
      if (!id) {
        id = 'm-' + slugify(parte, 40);
        const sal = reSalidaPrevia.test(parte);
        addVar({ id, etiqueta: parte.replace(/^\[\s*|\s*\]$/g, '') || 'dato', ambito: sal ? 'salida_previa' : 'prompt', tipo: sal ? 'texto_largo' : 'texto' });
      }
      seg.push({ t: 'var', id, raw: parte });
      if (!vars.includes(id)) vars.push(id);
    } else seg.push({ t: 'txt', v: parte });
  }
  return { seg, vars };
}
function segmentarPlantilla(pl: string, pid: string, anat: any[] = []): { seg: Segmento[]; vars: string[] } {
  const seg: Segmento[] = [];
  const vars: string[] = [];
  const re = /\{(entrada:)?([A-Za-z0-9_\-]+)\}/g;
  // límites de la anatomía (offsets sobre la plantilla)
  const parteEn = (i: number) => anat.find((x) => i >= x.inicio && i < x.fin)?.parte ?? null;
  const cortes = [...new Set(anat.flatMap((x) => [x.inicio, x.fin]))].sort((a, b) => a - b);
  const pushTxt = (ini: number, fin: number) => {
    let i = ini;
    for (const c of [...cortes.filter((c) => c > ini && c < fin), fin]) {
      if (c > i) seg.push({ t: 'txt', v: pl.slice(i, c), parte: parteEn(i) });
      i = c;
    }
  };
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pl))) {
    if (m.index > last) pushTxt(last, m.index);
    const id = m[1] ? `${pid}:${m[2]}` : m[2];
    if (!variables.has(id)) addVar({ id, etiqueta: m[2].replace(/[_-]/g, ' '), ambito: m[1] ? 'prompt' : 'proyecto' });
    seg.push({ t: 'var', id, raw: m[0], parte: parteEn(m.index) });
    if (!vars.includes(id)) vars.push(id);
    last = m.index + m[0].length;
  }
  if (last < pl.length) pushTxt(last, pl.length);
  return { seg, vars };
}
function tituloPrompt(texto: string, n: number, bloque: string | null): string {
  const m = texto.match(/act[úu]a (?:como|de)\s+(?:un|una|el|la)?\s*([^.,:;(\n]{3,80})/i);
  if (m) {
    const w = m[1].trim().split(/\s+/).slice(0, 6).join(' ');
    return w.charAt(0).toUpperCase() + w.slice(1);
  }
  if (bloque) return bloque.replace(/^✐\s*/, '');
  return `Prompt ${pad2(n)}`;
}

const prompts = new Map<string, Prompt>();
const esIdPrompt = (x: any) => typeof x === 'string' && /^c\d\d-p\d+(-prop)?$/.test(x);
/** Construye un Prompt a partir del registro de extracción `p` (o equivalente) y su capa P2. */
function construirPrompt(cap: any, p: any, capa: any, extra: Partial<Prompt> = {}): Prompt {
    // decisión del autor: plantilla_extendida (aulamarketing.digital/Ana → {marca}/{buyer_persona}) cuando exista
    const plantilla: string | undefined = capa?.plantilla_extendida ?? capa?.plantilla ?? capa?.texto_plantilla ?? capa?.template;
    // entradas (P2): datos puntuales del prompt; si viene_de es otro prompt, es una salida previa encadenada
    for (const e of capa?.entradas ?? []) {
      const id = `${p.id}:${e.nombre}`;
      addVar({
        id, etiqueta: e.descripcion || e.nombre.replace(/_/g, ' '), ayuda: null,
        tipo: 'texto_largo', ejemplo_libro: e.ejemplo_libro ?? null,
        ambito: esIdPrompt(e.viene_de) ? 'salida_previa' : 'prompt', fuente: esIdPrompt(e.viene_de) ? e.viene_de : null, modo: e.modo ?? null,
      });
    }
    const { seg, vars } = plantilla ? segmentarPlantilla(plantilla, p.id, capa?.plantilla_extendida ? [] : capa?.anatomia ?? []) : segmentarLiteral(p.texto, p.marcadores_variables || []);
    vars.forEach((id) => variables.get(id) && variables.get(id)!.usos++);
    const n = Number.parseInt(p.id.split('-p')[1], 10) || 0;
    const planSlug = planSlugDeCap(cap.numero);
    const entradasPrompt = (capa?.entradas ?? []).filter((e: any) => esIdPrompt(e.viene_de));
    return {
      id: p.id,
      capitulo: cap.numero,
      n,
      id_seccion: p.id_seccion,
      titulo: capa?.titulo_corto ?? capa?.titulo ?? tituloPrompt(p.texto, n, p.bloque ?? null),
      texto_literal: p.texto,
      segmentos: seg,
      variables: vars,
      ias: capa?.herramientas_ia?.length ? capa.herramientas_ia : p.herramienta_ia_indicada || [],
      ias_libro: p.herramienta_ia_indicada || [],
      pagina_libro: pagina(p.pagina_libro),
      origen: p.origen,
      contexto_previo: p.contexto_previo ?? null,
      contexto_posterior: p.contexto_posterior ?? null,
      salida_libro: capa?.salida_ejemplo_ref ?? p.salida_mostrada_en_libro ?? null,
      origen_ids: [...new Set<string>(entradasPrompt.length ? entradasPrompt.map((e: any) => e.viene_de) : (p.ids_prompts_origen ?? []))],
      misma_conversacion: entradasPrompt.filter((e: any) => e.modo === 'misma_conversacion' && !e.en_plantilla).map((e: any) => e.viene_de),
      nota_cadena: capa?.nota_cadena ?? p.nota_cadena ?? null,
      bloque: p.bloque ?? null,
      de_capa: !!plantilla,
      copiable: capa?.copiable !== false,
      nota: capa?.copiable === false ? (capa?.nota_extraccion ?? 'Ejemplo didáctico del libro') : null,
      tipo: capa?.tipo ?? 'texto',
      anatomia: !capa?.plantilla_extendida && (capa?.anatomia ?? []).length > 0,
      plan: planSlug,
      paso_url: null, // se rellena al construir los pasos
      propuesta: typeof capa?.propuesta_plataforma === 'string' ? capa.propuesta_plataforma : null,
      es_propuesta: false, basado_en: null, cita_libro: null, aviso: null, estado_revision: null,
      ...extra,
    };
}
for (const cap of capsRaw) for (const p of cap.prompts) prompts.set(p.id, construirPrompt(cap, p, promptsCapa.get(p.id)));
// prompts propuestos por la plataforma (capas/prompts/prompts.json → prompts_propuestos), pendientes de revisión
const propuestosCapa = asList(file('capas/prompts/prompts.json')?.prompts_propuestos).filter((x: any) => x?.id);
for (const pp of propuestosCapa) {
  const orig = prompts.get(pp.basado_en);
  const cap = capPorId.get(`c${pad2(pp.capitulo ?? orig?.capitulo ?? 0)}`);
  if (!cap) { log(`prompt propuesto ${pp.id} ignorado: capítulo ${pp.capitulo} no existe`); continue; }
  const etiquetas = (pl: string) => pl.replace(/\{(entrada:)?([A-Za-z0-9_\-]+)\}/g, (_m, _e, id) => `[${variables.get(id)?.etiqueta ?? id.replace(/_/g, ' ')}]`);
  const raw = {
    id: pp.id, id_seccion: pp.id_seccion ?? orig?.id_seccion, texto: etiquetas(pp.plantilla ?? ''), marcadores_variables: [],
    herramienta_ia_indicada: orig?.ias_libro ?? [], pagina_libro: orig?.pagina_libro ?? null, origen: 'propuesta',
    contexto_previo: null, contexto_posterior: orig?.contexto_posterior ?? null, salida_mostrada_en_libro: null, bloque: orig?.bloque ?? null,
  };
  const pr = construirPrompt(cap, raw, { ...pp, plantilla_extendida: undefined }, {
    es_propuesta: true, basado_en: pp.basado_en ?? null, cita_libro: pp.cita_libro ?? null,
    aviso: pp.aviso ?? 'Prompt redactado por la plataforma a partir de la descripción del libro (no es texto del libro). Pendiente de revisión del autor.',
    estado_revision: pp.estado_revision ?? 'pendiente', propuesta: null,
  });
  if (!pr.n && orig) pr.n = orig.n;
  prompts.set(pp.id, pr);
}
for (const p of prompts.values()) if (p.propuesta && !prompts.has(p.propuesta)) { log(`propuesta_plataforma ${p.propuesta} (de ${p.id}) no existe en prompts_propuestos`); p.propuesta = null; }
log(`prompts propuestos por la plataforma: ${propuestosCapa.length}`);

// ---------------------------------------------------------------- 4c. herramientas
// Fuentes: kit (cap. 16) + capas/herramientas/{visibilidad, alias_menciones, extra_herramientas}.json.
// Si faltan las capas de P1 se usa una correspondencia heurística por nombre.
const kitTodas = [
  ...(kitRaw.lista_herramientas_digitales || []).map((h: any) => ({ ...h, _tipo: 'digital' })),
  ...(kitRaw.lista_herramientas_ia || []).map((h: any) => ({ ...h, _tipo: 'ia' })),
];
const aliasFile = file('capas/herramientas/alias_menciones.json');
const alias = new Map<string, any>(asList(aliasFile, 'menciones').map((m: any) => [m.id, m]));
const extras = asList(file('capas/herramientas/extra_herramientas.json'), 'herramientas');
const kitPorNorm = new Map<string, any>();
for (const h of kitTodas) kitPorNorm.set(norm(h.nombre), h);
const kitNormsOrdenados = [...kitPorNorm.keys()].sort((a, b) => b.length - a.length);
function resolverKitHeuristico(m: any): any | null {
  if (m.id_kit && porId.get(m.id_kit)) return porId.get(m.id_kit);
  const n1 = norm(m.nombre);
  if (kitPorNorm.has(n1)) return kitPorNorm.get(n1);
  const n2 = norm(String(m.nombre).replace(/\(.*?\)/g, ''));
  if (kitPorNorm.has(n2)) return kitPorNorm.get(n2);
  for (const k of kitNormsOrdenados) if (k.length >= 4 && n2.startsWith(k)) return kitPorNorm.get(k);
  return null;
}
const herramientas = new Map<string, Herramienta>(); // por id (k-…, x-… o cNN-hNN)
const slugsUsados = new Set<string>();
function nuevoSlug(nombre: string) {
  let s = slugify(nombre, 50);
  let i = 2;
  while (slugsUsados.has(s)) s = `${slugify(nombre, 46)}-${i++}`;
  slugsUsados.add(s);
  return s;
}
function urlDe(id: string, mencionUrl?: string | null): { url: string | null; fuente: string | null } {
  const v = vis.get(id);
  if (v && (v.url || v.url_oficial || v.url_actual)) return { url: v.url || v.url_oficial || v.url_actual, fuente: 'web oficial (comprobada en nov. 2026)' };
  if (mencionUrl) return { url: mencionUrl, fuente: 'citada en el libro' };
  if (!capas.visibilidad) {
    const e = estadoHerr.get(id);
    if (e && e.estado === 'ACTIVA' && e.url_oficial) return { url: e.url_oficial, fuente: 'web oficial (comprobada en nov. 2026)' };
  }
  return { url: null, fuente: null };
}
function nuevaHerramienta(id: string, nombreLibro: string, descripcion: string | null, tipo: 'ia' | 'digital', enKit: boolean, pagKit: number | null, urlLibro?: string | null): Herramienta {
  const nombre = nombreVis(id, nombreLibro);
  const u = urlDe(id, urlLibro);
  const h: Herramienta = { id, slug: nuevoSlug(nombre), nombre, nombre_libro: nombreLibro, descripcion, tipo, en_kit: enKit, pagina_kit: pagKit, bloques: [], capitulos: [], menciones: [], url: u.url, url_fuente: u.fuente, usos: [], nota: vis.get(id)?.nota_web ?? null };
  herramientas.set(id, h);
  return h;
}
for (const h of kitTodas) if (visible(h.id)) nuevaHerramienta(h.id, h.nombre, h.descripcion ?? null, h._tipo, true, pagina(h.pagina_libro));
for (const x of extras) if (x.mostrar !== false && x.id) {
  const t = nuevaHerramienta(x.id, x.nombre, x.descripcion ?? null, x.es_ia === true ? 'ia' : 'digital', false, null, x.url_oficial ?? null);
  if (x.url_oficial) { t.url = x.url_oficial; t.url_fuente = 'web oficial'; }
}
const mencionATool = new Map<string, string | null>(); // cNN-hNN → id herramienta (o null = texto suelto / oculta)
const mencionSuelta = new Map<string, any>();
let sinResolver = 0, descartadas = 0, ocultas = 0;
const nombreBasura = (n: string) => n.length > 48 || /['"«»“”]/.test(n) || /^[a-záéíóúñ]/.test(n);
for (const cap of capsRaw) {
  for (const m of cap.herramientas_mencionadas) {
    let tool: Herramienta | undefined;
    const al = alias.get(m.id);
    if (al) {
      if (al.mostrar === false) { ocultas++; mencionATool.set(m.id, null); continue; }
      const fid = al.id_ficha_web ?? al.id_kit ?? al.id_extra;
      if (fid) {
        tool = herramientas.get(fid);
        if (!tool) { ocultas++; mencionATool.set(m.id, null); continue; }
      } else if (al.correspondencia === 'fragmento_de_prompt') { descartadas++; mencionATool.set(m.id, null); continue; }
      else {
        sinResolver++;
        mencionATool.set(m.id, null);
        mencionSuelta.set(m.id, { ...m, nombre: al.nombre_mostrar_sugerido || m.nombre });
        continue;
      }
    } else {
      if (!visible(m.id)) { ocultas++; mencionATool.set(m.id, null); continue; }
      const k = resolverKitHeuristico(m);
      if (k) {
        tool = herramientas.get(k.id);
        if (!tool) { ocultas++; mencionATool.set(m.id, null); continue; }
      } else if (!aliasFile && m.bloque && !nombreBasura(m.nombre)) {
        tool = [...herramientas.values()].find((t) => !t.en_kit && norm(t.nombre_libro) === norm(m.nombre))
          ?? nuevaHerramienta(m.id, m.nombre, m.descripcion_libro ?? null, m.es_ia === true ? 'ia' : 'digital', false, null, m.url_en_libro);
      }
      if (!tool) {
        if (nombreBasura(m.nombre)) { descartadas++; mencionATool.set(m.id, null); continue; }
        sinResolver++;
        mencionATool.set(m.id, null);
        mencionSuelta.set(m.id, m);
        continue;
      }
    }
    mencionATool.set(m.id, tool.id);
    if (m.bloque && !tool.bloques.includes(m.bloque)) tool.bloques.push(m.bloque);
    if (!tool.capitulos.includes(cap.numero)) tool.capitulos.push(cap.numero);
    tool.menciones.push({ capitulo: cap.numero, id_seccion: m.id_seccion, bloque: m.bloque ?? null, descripcion: m.descripcion_libro ?? null, pagina_libro: pagina(m.pagina_libro) });
  }
}
if (!capas.visibilidad) log('capas/herramientas/visibilidad.json no existe: se muestran todas las herramientas (marcador pendiente en /herramientas)');
log(`herramientas: ${herramientas.size} fichas en el directorio; menciones sin ficha (texto suelto): ${sinResolver}; descartadas (fragmentos/no nombres): ${descartadas}; ocultas por visibilidad: ${ocultas}`);

// ---------------------------------------------------------------- glosario
const defsPorSlug = new Map<string, Termino>();
const slugPorDefinicion = new Map<string, string>(); // cNN-dNN → slug
function slugTermino(t: string) {
  return slugify(t.replace(/\s*\(.*?\)\s*/g, ' ').trim() || t, 60);
}
const glosFile = file('capas/glosario/glosario.json');
if (glosFile) {
  for (const t of asList(glosFile, 'terminos', 'glosario')) {
    const termino = t.termino ?? t.nombre;
    if (!termino) continue;
    const slug = t.slug ?? slugTermino(termino);
    const defs = Array.isArray(t.definiciones_libro) ? t.definiciones_libro : Array.isArray(t.definiciones) ? t.definiciones : [{ definicion: t.definicion }];
    defsPorSlug.set(slug, {
      slug, termino, corta: t.definicion_corta ?? null, variantes: t.variantes ?? [], relacionados: t.relacionados ?? [],
      definiciones: defs.filter(Boolean).map((d: any) => {
        const src = porId.get(d.id) || {};
        if (d.id && !slugPorDefinicion.has(d.id)) slugPorDefinicion.set(d.id, slug);
        const id_seccion = d.id_seccion ?? src.id_seccion ?? null;
        const capN = Number.parseInt(String(d.capitulo ?? id_seccion ?? d.id ?? '').replace(/^c/, '').slice(0, 2), 10) || 0;
        // el texto literal sale de extraccion/ (ya corregida); el de la capa solo si no hay id
        return { texto: src.definicion ?? d.definicion ?? d.texto ?? '', termino_libro: d.termino_libro ?? src.termino ?? null, capitulo: capN, id_seccion, pagina_libro: pagina(src.pagina_libro ?? d.pagina_libro), plan: planSlugDeCap(capN), paso_url: null };
      }),
    });
  }
} else {
  log('capas/glosario no existe: glosario construido con las definiciones literales de extraccion/');
  for (const cap of capsRaw) {
    for (const d of cap.definiciones) {
      const slug = slugTermino(d.termino);
      const t: Termino = defsPorSlug.get(slug) ?? { slug, termino: d.termino, corta: null, variantes: [], relacionados: [], definiciones: [] };
      t.definiciones.push({ texto: d.definicion, termino_libro: d.termino, capitulo: cap.numero, id_seccion: d.id_seccion ?? null, pagina_libro: pagina(d.pagina_libro), plan: planSlugDeCap(cap.numero), paso_url: null });
      defsPorSlug.set(slug, t);
      slugPorDefinicion.set(d.id, slug);
    }
  }
}
// detección de términos en el texto (capas/glosario/deteccion.json): patrones por término
type Patron = { forma: string; mayusculas: boolean; slug: string };
const patronesDeteccion: Patron[] = [];
{
  const det = file('capas/glosario/deteccion.json');
  for (const t of asList(det, 'terminos')) {
    if (!t.slug || !defsPorSlug.has(t.slug)) continue;
    for (const p of t.patrones ?? []) if (p.forma) patronesDeteccion.push({ forma: p.forma, mayusculas: !!p.mayusculas, slug: t.slug });
  }
  patronesDeteccion.sort((a, b) => b.forma.length - a.forma.length);
}
// tarjetas de repaso por capítulo (capas/glosario/repaso.json)
const repasoPorCap = new Map<number, { pregunta: string; respuesta: string }[]>();
for (const c of asList(file('capas/glosario/repaso.json'), 'capitulos')) {
  const n = Number.parseInt(String(c.capitulo).replace(/^c/, ''), 10);
  if (n) repasoPorCap.set(n, (c.tarjetas ?? []).filter((x: any) => x.pregunta && x.respuesta).map((x: any) => ({ pregunta: x.pregunta, respuesta: x.respuesta })));
}

// ---------------------------------------------------------------- vídeos previstos
const videosPorSeccion = new Map<string, Video[]>();
{
  const vp = file('investigacion/videos_pendientes.json');
  const add = (x: any, tipo: Video['tipo']) => {
    const capN = Number.parseInt(String(x.cap), 10);
    const num = String(x.seccion || '').match(/^\s*(\d+(?:\.\d+)?)/);
    if (!capN || !num) return;
    const sid = `c${pad2(capN)}-s${num[1]}`;
    const l = videosPorSeccion.get(sid) ?? [];
    l.push({ id: x.id, tipo, mostrar: x.mostrar ?? x.contexto ?? '', herramientas: x.herramientas ?? null, cita: x.cita ?? null, pagina_libro: x.pag_libro ?? null });
    videosPorSeccion.set(sid, l);
  };
  (vp?.videos || []).forEach((x: any) => add(x, 'vídeo'));
  (vp?.articulos || []).forEach((x: any) => add(x, 'artículo'));
}

// ---------------------------------------------------------------- entregables del libro
const entregables = new Map<string, Entregable>();
function seccionPorPagina(cap: any, pg: number | null): string | null {
  if (pg == null) return null;
  let r: string | null = null;
  for (const s of cap.secciones) if ((pagina(s.pagina_pdf) ?? 0) <= pg) r = s.id;
  return r;
}
const entregableSeccion = new Map<string, string | null>();
for (const cap of capsRaw) {
  const ej = cap.ejemplo_aulamarketing;
  if (!ej) continue;
  for (const e of ej.entregables || []) {
    const fid = e.id_figura ?? (e.ids_figuras || [])[0];
    const f = fid ? porId.get(fid) : null;
    entregables.set(e.id, {
      id: e.id, titulo: e.titulo, texto: e.texto, pagina_libro: pagina(e.pagina_libro), capitulo: cap.numero,
      figura: f ? { id: f.id, tipo: f.tipo, numero: f.numero, titulo: f.titulo, pagina_libro: f.pagina_libro, contenido: f.contenido, origen: f.origen } : null,
      plan: planSlugDeCap(cap.numero), paso: null,
    });
    const sid = e.id_seccion ?? ej.id_seccion ?? seccionPorPagina(cap, pagina(e.pagina_pdf));
    entregableSeccion.set(e.id, sid ?? null);
  }
}

// ---------------------------------------------------------------- pasos
function construirPaso(cap: any, sid: string, tituloDef: string | undefined, n: number, base: string, apartadosDef?: string[]): Paso | null {
  const hit = buscarSeccion(sid);
  if (!hit) { log(`paso ignorado: sección ${sid} no existe`); return null; }
  const unidades = (apartadosDef?.length ? apartadosDef : [sid]).map((id) => buscarSeccion(id)).filter(Boolean) as NonNullable<ReturnType<typeof buscarSeccion>>[];
  const s = hit.apt ?? hit.sub ?? hit.sec;
  // contenedor inmediato y si este paso es el primero dentro de él (hereda su introducción)
  const padre = hit.apt ? hit.sub : hit.sub ? hit.sec : null;
  const esPrimeraSub = !!padre && ((hit.apt ? padre.apartados : padre.subsecciones)[0]?.id === s.id);
  const abuelo = hit.apt ? hit.sec : null;
  const esPrimeraDeAbuelo = esPrimeraSub && !!abuelo && abuelo.subsecciones[0]?.id === hit.sub.id;
  const pertenece = (idEl: string | null | undefined) =>
    unidades.some((u) => enSeccion(idEl, (u.apt ?? u.sub ?? u.sec).id)) ||
    (esPrimeraSub && idEl === padre.id) || (esPrimeraDeAbuelo && idEl === abuelo.id);
  const titulo = tituloDef || s.titulo;
  const slug = `${n}-${slugify(titulo, 50)}`;
  const url = `${base}${slug}/`;
  const resUnidades = unidades.map((u) => resumenPorSeccion.get((u.apt ?? u.sub ?? u.sec).id)).filter(Boolean);
  // subsección sin resumen propio → resumen de su sección (P3 resume por sección); apartados → marcador [pendiente]
  const r = resUnidades[0] ?? (padre && (!hit.apt || esPrimeraSub) ? resumenPorSeccion.get(padre.id) : undefined);
  const rPadre = padre && !hit.apt ? resumenPorSeccion.get(padre.id) : undefined;
  const resumenTxt = (resUnidades.length > 1 ? resUnidades.map(resumenDe).filter(Boolean).join(' ') : resumenDe(r)) || resumenDe(rPadre) || null;
  const texto: Paso['texto'] = [];
  if (esPrimeraDeAbuelo && (abuelo.texto || '').trim()) texto.push({ titulo: abuelo.titulo, numero: abuelo.numero, texto: abuelo.texto, resumen: null });
  if (esPrimeraSub && (padre.texto || '').trim()) texto.push({ titulo: padre.titulo, numero: padre.numero, texto: padre.texto, resumen: null });
  for (const u of unidades) {
    const x = u.apt ?? u.sub ?? u.sec;
    const anid = !!(u.apt || u.sub);
    texto.push({ titulo: anid ? x.titulo : null, numero: anid ? (x.numero ?? x.id.split('-s')[1]) : null, texto: x.texto || '', resumen: unidades.length > 1 ? resumenDe(resumenPorSeccion.get(x.id)) : null });
    for (const sub of x.subsecciones || []) {
      texto.push({ titulo: sub.titulo, numero: sub.numero, texto: sub.texto || '', resumen: resumenDe(resumenPorSeccion.get(sub.id)) });
      for (const ap of sub.apartados || []) texto.push({ titulo: ap.titulo, numero: ap.id.split('-s')[1], texto: ap.texto || '', resumen: resumenDe(resumenPorSeccion.get(ap.id)) });
    }
    for (const ap of x.apartados || []) texto.push({ titulo: ap.titulo, numero: ap.id.split('-s')[1], texto: ap.texto || '', resumen: resumenDe(resumenPorSeccion.get(ap.id)) });
  }
  const ps = cap.prompts.filter((p: any) => pertenece(p.id_seccion)).map((p: any) => prompts.get(p.id)!).filter(Boolean);
  ps.forEach((p: Prompt) => { if (!p.paso_url) p.paso_url = url; });
  // herramientas
  const tools: ToolRef[] = [];
  const vistos = new Set<string>();
  for (const m of cap.herramientas_mencionadas.filter((m: any) => pertenece(m.id_seccion))) {
    const tid = mencionATool.get(m.id);
    if (tid) {
      const t = herramientas.get(tid)!;
      if (vistos.has(t.slug)) continue;
      vistos.add(t.slug);
      tools.push({ nombre: t.nombre, slug: t.slug, tipo: t.tipo, descripcion: t.descripcion });
    } else if (mencionSuelta.has(m.id)) {
      const k = 'x' + norm(m.nombre);
      if (vistos.has(k)) continue;
      vistos.add(k);
      tools.push({ nombre: nombreVis(m.id, m.nombre), slug: null, tipo: m.es_ia === true ? 'ia' : null, descripcion: m.descripcion_libro ?? null });
    }
  }
  const defs: Definicion[] = cap.definiciones.filter((d: any) => pertenece(d.id_seccion)).map((d: any) => ({ id: d.id, termino: d.termino, definicion: d.definicion, pagina_libro: pagina(d.pagina_libro), slug: slugPorDefinicion.get(d.id) ?? null }));
  const figs: Figura[] = cap.figuras_tablas.filter((f: any) => pertenece(f.id_seccion)).map((f: any) => ({ id: f.id, tipo: f.tipo, numero: f.numero, titulo: f.titulo, pagina_libro: f.pagina_libro, contenido: f.contenido, origen: f.origen }));
  const ents = [...entregables.values()].filter((e) => e.capitulo === cap.numero && pertenece(entregableSeccion.get(e.id)));
  // términos detectables: los del glosario definidos en este capítulo (evita saturar de globos)
  const terms: Paso['terminos'] = [];
  const vistosT = new Set<string>();
  for (const pt of patronesDeteccion) {
    const t = defsPorSlug.get(pt.slug)!;
    if (!t.definiciones.some((d) => d.capitulo === cap.numero)) continue;
    terms.push({ termino: pt.forma, slug: pt.slug, definicion: t.corta ?? t.definiciones[0]?.texto ?? '', mayusculas: pt.mayusculas });
    vistosT.add(pt.slug);
  }
  const vids: Video[] = [];
  for (const [k, lista] of videosPorSeccion) if (pertenece(k)) vids.push(...lista);
  return {
    n, slug, url, id_seccion: s.id, titulo, numero_libro: s.numero ?? s.id.split('-s')[1], pagina_libro: pagina(s.pagina_libro),
    idea_clave: ideaDe(r) ?? ideaDe(rPadre), resumen: resumenTxt, minutos: resUnidades.reduce((a: number, x: any) => a + (x?.minutos_lectura_integro ?? 0), 0) || (r?.minutos_lectura_integro ?? null),
    texto, prompts: ps, herramientas: tools, definiciones: defs, figuras: figs, entregables: ents,
    salidas_libro: ps.filter((p: Prompt) => p.salida_libro).map((p: Prompt) => ({ prompt: p.id, texto: p.salida_libro! })),
    videos: vids,
    terminos: terms,
    es_ejemplo: /ejemplo completo|construyendo el customer journey/i.test(titulo),
  };
}

// ---------------------------------------------------------------- cadenas
const cadenasCapa = asList(file('capas/prompts/cadenas.json'), 'cadenas');
function cadenasDePlan(planDef: any, cap: any, base: string): Cadena[] {
  const out: Cadena[] = [];
  const capId = cap.id;
  const fromCapa = cadenasCapa.filter((c: any) =>
    (planDef.cadenas || []).includes(c.id) ||
    (!(planDef.cadenas || []).length && JSON.stringify(c.prompts ?? c.pasos ?? c.ids_prompts ?? []).includes(`"${capId}-p`)));
  for (const c of fromCapa) {
    const items = c.pasos ?? c.prompts ?? c.ids_prompts ?? c.nodos ?? [];
    const nodos: Cadena['nodos'] = items.map((x: any) => {
      const pid = typeof x === 'string' ? x : x.id_prompt ?? x.prompt ?? (String(x.id || '').match(/^c\d\d-p\d+$/) ? x.id : null);
      const p = pid ? prompts.get(pid) : null;
      const o = typeof x === 'object' ? x : {};
      return {
        tipo: p ? 'prompt' : 'otro', prompt: p ? p.id : null,
        titulo: o.titulo || o.etiqueta || p?.titulo || o.paso_no_prompt || 'Paso sin prompt',
        nota: o.nota ?? (p ? null : o.texto_literal ?? null),
        produce: o.produce ?? null, consume: Array.isArray(o.consume) ? o.consume : [],
      };
    });
    const slug = slugify(c.id, 40);
    out.push({ id: c.id, slug, titulo: c.titulo ?? c.nombre ?? `Cadena de prompts`, descripcion: c.descripcion ?? null, derivada: false, nodos, plan: planDef.slug, url: `${base}cadena/${slug}/` });
    // orígenes por produce/consume si el prompt no los declara (capas/prompts → entradas)
    for (const nd of nodos) {
      if (!nd.prompt || !nd.consume.length) continue;
      const pr = prompts.get(nd.prompt)!;
      if (pr.origen_ids.length) continue;
      pr.origen_ids = nodos.filter((o) => o.prompt && o.produce && nd.consume.includes(o.produce)).map((o) => o.prompt!) as string[];
    }
  }
  if (!out.length) {
    const enCadena = cap.prompts.filter((p: any) => p.nota_cadena || (p.ids_prompts_origen || []).length);
    if (enCadena.length >= 2) {
      const slug = `${capId}-cadena`;
      out.push({
        id: slug, slug, titulo: `Cadena de prompts del capítulo ${cap.numero}`, descripcion: PENDIENTE('cadena derivada de la extracción; P2 la definirá en capas/prompts/cadenas.json'), derivada: true,
        nodos: enCadena.map((p: any) => ({ tipo: 'prompt' as const, prompt: p.id, titulo: prompts.get(p.id)!.titulo, nota: p.nota_cadena ?? null, produce: null, consume: [] })),
        plan: planDef.slug, url: `${base}cadena/${slug}/`,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------- planes
const planes: Plan[] = [];
for (const pd of planesDef) {
  const cap = capPorId.get(`c${pad2(pd.capitulo_origen)}`);
  if (!cap) { log(`plan ${pd.id} ignorado: capítulo ${pd.capitulo_origen} no existe`); continue; }
  const base = `/planes/${pd.slug}/`;
  const pasos = (pd.pasos || []).map((x: any, i: number) => construirPaso(cap, x.id_seccion, x.titulo, i + 1, base, x.apartados)).filter(Boolean) as Paso[];
  for (const pa of pasos) pa.entregables.forEach((e) => (e.paso = pa.url));
  const rc = resumenPorCap.get(cap.id);
  const ents = (pd.entregables || []).map((id: string) => entregables.get(id)).filter(Boolean) as Entregable[];
  planes.push({
    id: pd.id, slug: pd.slug, url: base, titulo: pd.titulo, capitulo: cap.numero, titulo_capitulo: cap.titulo, parte: cap.parte ?? null,
    categoria: pd.categoria, objetivos_meta: pd.objetivos_meta || [],
    promesa: rc?.promesa ?? null, al_terminar: rc?.al_terminar_tendras ?? [], historia_ana: rc?.historia_ana ?? cap.apertura?.narrativa_ana ?? null,
    resumen_capitulo: rc?.resumen_capitulo ?? null, objetivos_aprendizaje: cap.objetivos_aprendizaje || [], autoria: cap.autoria ?? null,
    pasos, entregables: ents, prerrequisitos: [], prompts: (pd.prompts || []).map((id: string) => prompts.get(id)).filter(Boolean) as Prompt[],
    cadenas: cadenasDePlan(pd, cap, base),
    minutos: pasos.reduce((a, p) => a + (p.minutos ?? 0), 0) || null,
  });
}
for (const pl of planes) {
  const pd = planesDef.find((x) => x.slug === pl.slug)!;
  pl.prerrequisitos = (pd.prerrequisitos_suaves || []).map((r: any) => {
    const o = planes.find((x) => x.slug === r.plan || x.id === r.plan);
    return { plan: r.plan, plan_titulo: o?.titulo ?? r.plan, plan_url: o?.url ?? '/planes/', que_aporta: r.que_aporta, alternativa_rapida: r.alternativa_rapida };
  });
}
// Antes de empezar (cap. 4) – transversal
const cap04 = capPorId.get('c04');
const antesPasos = cap04.secciones.map((s: any, i: number) => construirPaso(cap04, s.id, undefined, i + 1, '/antes-de-empezar/#')).filter(Boolean) as Paso[];
antesPasos.forEach((p) => { p.url = `/antes-de-empezar/#${p.slug}`; p.prompts.forEach((pr) => (pr.paso_url = p.url)); });
const rc04 = resumenPorCap.get('c04');
export const antesDeEmpezar = {
  ...ANTES, capitulo: 4, titulo_capitulo: cap04.titulo, promesa: rc04?.promesa ?? null, resumen_capitulo: rc04?.resumen_capitulo ?? null,
  objetivos_aprendizaje: (cap04.objetivos_aprendizaje || []) as string[], pasos: antesPasos, autoria: cap04.autoria ?? null,
};

// usos de herramientas y enlaces del glosario
for (const pl of planes) for (const pa of pl.pasos) for (const t of pa.herramientas) if (t.slug) {
  const h = [...herramientas.values()].find((x) => x.slug === t.slug)!;
  h.usos.push({ plan: pl.slug, plan_titulo: pl.titulo, paso: pa.slug, paso_titulo: pa.titulo, url: pa.url });
}
const pasoPorSeccion = new Map<string, string>();
for (const pa of [...planes.flatMap((pl) => pl.pasos), ...antesPasos]) {
  pasoPorSeccion.set(pa.id_seccion, pa.url);
  const padre = pa.id_seccion.includes('.') ? pa.id_seccion.slice(0, pa.id_seccion.lastIndexOf('.')) : null;
  if (padre && !pasoPorSeccion.has(padre)) pasoPorSeccion.set(padre, pa.url); // primer subpaso representa a la sección
}
function pasoUrlDe(idSec: string | null | undefined): string | null {
  let k = idSec || '';
  while (k) {
    if (pasoPorSeccion.has(k)) return pasoPorSeccion.get(k)!;
    k = k.includes('.') ? k.slice(0, k.lastIndexOf('.')) : '';
  }
  return null;
}
for (const t of defsPorSlug.values()) for (const d of t.definiciones) d.paso_url = pasoUrlDe(d.id_seccion);
for (const p of prompts.values()) if (!p.paso_url) p.paso_url = pasoUrlDe(p.id_seccion);

// ---------------------------------------------------------------- exportación
const herramientasLista = [...herramientas.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
const terminosLista = [...defsPorSlug.values()].sort((a, b) => a.termino.localeCompare(b.termino, 'es', { sensitivity: 'base' }));

export function getPlanes(): Plan[] { return planes; }
export function getPlan(slug: string): Plan | undefined { return planes.find((p) => p.slug === slug); }
export function getPrompts(): Prompt[] {
  // cada propuesta de la plataforma va justo detrás del prompt del libro en que se basa
  return [...prompts.values()].sort((a, b) => a.capitulo - b.capitulo || a.n - b.n || Number(a.es_propuesta) - Number(b.es_propuesta));
}
export function getPrompt(id: string): Prompt | undefined { return prompts.get(id); }
export function getHerramientas(): Herramienta[] { return herramientasLista; }
export function getHerramienta(slug: string): Herramienta | undefined { return herramientasLista.find((h) => h.slug === slug); }
export function getTerminos(): Termino[] { return terminosLista; }
export function getTermino(slug: string): Termino | undefined { return defsPorSlug.get(slug); }
export function getVariables(): Variable[] { return [...variables.values()]; }
export function getVariable(id: string): Variable | undefined { return variables.get(id); }
export function variablesDe(p: Prompt): Variable[] { return p.variables.map((id) => variables.get(id)!).filter(Boolean); }
export function getReferencias() { return referencias; }
export function getRepaso(capitulo: number) { return repasoPorCap.get(capitulo) ?? []; }
export function getCapitulos() { return capsRaw.map((c) => ({ id: c.id, numero: c.numero, titulo: c.titulo, parte: c.parte, autoria: c.autoria, plan: planSlugDeCap(c.numero) })); }
export function getKitControl() { return kitRaw.control ?? null; }
export function tituloPlan(slug: string | null): string | null {
  if (!slug) return null;
  if (slug === ANTES.slug) return ANTES.titulo;
  return planes.find((p) => p.slug === slug)?.titulo ?? null;
}
export function urlPlan(slug: string | null): string | null {
  if (!slug) return null;
  if (slug === ANTES.slug) return ANTES.url;
  return planes.find((p) => p.slug === slug)?.url ?? null;
}
export function categoriaDeCap(n: number): string | null {
  return planes.find((p) => p.capitulo === n)?.categoria ?? (n === 4 ? 'Antes de empezar' : null);
}
export function bloquesHerramientas(): string[] {
  return [...new Set(herramientasLista.flatMap((h) => h.bloques))].sort((a, b) => a.localeCompare(b, 'es'));
}

// Mensajes de build (una sola vez)
let impreso = false;
export function imprimirRegistro() {
  if (impreso) return;
  impreso = true;
  console.log('\n[datos] Capas disponibles: ' + Object.entries(capas).map(([k, v]) => `${k}=${v ? 'sí' : 'NO'}`).join(', '));
  for (const m of registro) console.log('[datos] ' + m);
}
imprimirRegistro();
