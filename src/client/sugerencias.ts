// Sugerencias rápidas: insertan (campo vacío) o añaden (campo con texto) el valor al campo indicado
// y disparan "input" para que lo guarden los manejadores habituales (Mi proyecto, tarjetas de prompt).
import { anunciar } from './estado';

document.querySelectorAll<HTMLElement>('[data-js="sugerencias"]').forEach((grupo) => {
  if (grupo.dataset.listo) return;
  grupo.dataset.listo = '1';
  grupo.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-valor]');
    if (!b) return;
    const campo = document.getElementById(grupo.dataset.para || '') as HTMLInputElement | HTMLTextAreaElement | null;
    if (!campo) return;
    if (campo.readOnly) { anunciar('Cambia a «Mi proyecto» en la barra superior para editar este dato.'); return; }
    const valor = b.dataset.valor || '';
    const actual = campo.value.trim();
    if (actual && actual.toLowerCase().split(/[,;.\n]\s*/).includes(valor.toLowerCase())) { anunciar(`«${valor}» ya está en el campo`); campo.focus(); return; }
    campo.value = actual ? `${actual.replace(/[,;]\s*$/, '')}, ${valor.toLowerCase()}` : valor;
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    campo.focus();
    anunciar(actual ? `Añadido «${valor}». Puedes ampliarlo con tus palabras.` : `Insertado «${valor}». Puedes ampliarlo con tus palabras.`);
  });
});
