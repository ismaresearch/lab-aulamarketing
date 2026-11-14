// "Guardar el resultado en Mi plan X": entregable del alumno por paso.
import { leer, guardar, suscribir, anunciar } from './estado';

document.querySelectorAll<HTMLElement>('[data-js="entregable"]').forEach((box) => {
  const { plan, paso, titulo } = box.dataset as { plan: string; paso: string; titulo: string };
  const ta = box.querySelector<HTMLTextAreaElement>('textarea')!;
  const estado = box.querySelector<HTMLElement>('[data-js="entregable-estado"]');
  const prompts: string[] = JSON.parse(box.dataset.prompts || '[]');
  const pintar = () => {
    const e = leer().entregables[plan]?.[paso];
    if (document.activeElement !== ta) ta.value = e?.contenido || '';
    if (estado) estado.textContent = e ? `Guardado en este navegador · ${new Date(e.fecha).toLocaleString('es-ES')}` : 'Aún no has guardado nada en este paso.';
  };
  const salvar = () => {
    const contenido = ta.value.trim();
    guardar((s) => {
      s.entregables[plan] ||= {};
      if (contenido) s.entregables[plan][paso] = { contenido: ta.value, fecha: new Date().toISOString(), titulo };
      else delete s.entregables[plan][paso];
      if (contenido) (s.progreso[plan] ||= {})[paso] = true;
    });
    anunciar(contenido ? 'Guardado en tu plan' : 'Entregable vacío: se ha quitado de tu plan');
  };
  box.querySelector('[data-js="entregable-guardar"]')?.addEventListener('click', salvar);
  box.querySelector('[data-js="entregable-respuestas"]')?.addEventListener('click', () => {
    const r = leer().respuestas;
    const textos = prompts.map((id) => r[id]?.texto?.trim()).filter(Boolean);
    if (!textos.length) { anunciar('Todavía no has pegado respuestas en los prompts de este paso.'); return; }
    ta.value = [ta.value.trim(), ...textos].filter(Boolean).join('\n\n');
    ta.focus();
    anunciar(`${textos.length} respuesta(s) añadida(s). Revisa el texto y pulsa Guardar.`);
  });
  pintar();
  suscribir(pintar);
});
