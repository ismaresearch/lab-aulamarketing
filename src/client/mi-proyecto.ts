// Formulario "Mi proyecto": guardado automático en el navegador.
import { leer, guardar, suscribir, anunciar, borrarTodo } from './estado';

const form = document.querySelector<HTMLFormElement>('[data-js="form-proyecto"]');
if (form) {
  const estado = document.querySelector<HTMLElement>('[data-js="guardado-estado"]');
  const contador = document.querySelector<HTMLElement>('[data-js="contador"]');
  const contadorOpc = document.querySelector<HTMLElement>('[data-js="contador-opcionales"]');
  const campos = [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[name]')];
  const pintar = () => {
    const p = leer().proyecto;
    for (const c of campos) if (document.activeElement !== c) {
      if (c instanceof HTMLInputElement && c.type === 'radio') c.checked = p[c.name] === c.value;
      else c.value = p[c.name] ?? '';
    }
    // solo los datos esenciales (data-obligatoria="true") cuentan para el progreso; los opcionales aparte
    const nombres = (ob: boolean) => [...new Set(campos.filter((c) => (c.dataset.obligatoria === 'true') === ob).map((c) => c.name))];
    const llenos = (ns: string[]) => ns.filter((n) => (p[n] || '').trim()).length;
    const ess = nombres(true), opc = nombres(false);
    if (contador) contador.textContent = `${llenos(ess)} de ${ess.length} datos esenciales`;
    if (contadorOpc) contadorOpc.textContent = opc.length ? `Opcionales: ${llenos(opc)} de ${opc.length} rellenados` : '';
  };
  let t: number | undefined;
  form.addEventListener('input', (ev) => {
    const c = ev.target as HTMLInputElement;
    if (!c.name) return;
    guardar((e) => (e.proyecto[c.name] = c.value));
    window.clearTimeout(t);
    t = window.setTimeout(() => { if (estado) estado.textContent = `Guardado en este navegador · ${new Date().toLocaleTimeString('es-ES')}`; }, 300);
  });
  form.addEventListener('submit', (ev) => { ev.preventDefault(); anunciar('Tu proyecto está guardado en este navegador'); });
  document.querySelector('[data-js="borrar-todo"]')?.addEventListener('click', () => {
    if (!confirm('Se borrarán tu proyecto, respuestas y entregables de este navegador. ¿Seguro? (Descarga antes una copia si la necesitas.)')) return;
    borrarTodo();
    anunciar('Datos borrados de este navegador');
  });
  // el aviso de modo se muestra/oculta por CSS (data-solo-modo="ejemplo")
  pintar();
  suscribir(pintar);
}
