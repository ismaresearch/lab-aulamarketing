export const NAV = [
  { href: '/planes/', etiqueta: 'Planes', icono: 'planes' },
  { href: '/prompts/', etiqueta: 'Prompts', icono: 'prompts' },
  { href: '/herramientas/', etiqueta: 'Herramientas', icono: 'herramientas' },
  { href: '/mis-planes/', etiqueta: 'Mis planes', icono: 'mis-planes' },
] as const;
export const NAV_SECUNDARIA = [
  { href: '/', etiqueta: '¿Qué quieres conseguir?', icono: 'bandera' },
  { href: '/antes-de-empezar/', etiqueta: 'Antes de empezar', icono: 'escuela' },
  { href: '/mi-proyecto/', etiqueta: 'Mi proyecto', icono: 'maletin' },
  { href: '/glosario/', etiqueta: 'Glosario', icono: 'diccionario' },
  { href: '/laboratorio-visual/', etiqueta: 'Laboratorio visual', icono: 'camara' },
  { href: '/acerca/', etiqueta: 'Acerca del libro', icono: 'info' },
] as const;
export function activo(path: string, href: string) {
  if (href === '/') return path === '/';
  return path === href || path.startsWith(href);
}
export interface Esquema { titulo: string; url: string; plan?: string; pasos: { n: number; titulo: string; url: string; slug?: string }[] }
