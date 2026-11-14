# lab.aulamarketing.digital — esqueleto (P4)

Sitio estático en Astro 5 que convierte el libro *Desde cero hasta el éxito* en **planes verticales** independientes.
Sin backend: los datos del alumno viven en `localStorage` (clave `lab-aulamarketing:v1`) con copia `.json` descargable.

## Regenerar

```bash
cd /home/claude/libro/sitio
npm install
npm run build        # prebuild (copia JSON) → astro build → comprobación de enlaces → informe de páginas y peso
npm run test:docx    # genera tmp/prueba-*.docx con la misma función que usa el navegador
npm run dev          # desarrollo en http://localhost:4321
```

Si cambia el borrador de planes: `python3 ../capas/planes/generar_borrador.py --forzar` (sobrescribe
`capas/planes/planes.json`; sin `--forzar` no toca un archivo existente, por si el autor lo ha editado a mano).

## Estructura

```
sitio/
├─ astro.config.mjs          site, output static, trailingSlash always, build.format directory
├─ scripts/
│  ├─ prebuild.mjs           copia ../extraccion, ../capas/*, ../investigacion/{videos_pendientes,estado_herramientas}.json → src/data/ (sin modificarlos)
│  ├─ check-links.mjs        enlaces internos y anclas rotas en dist/ (falla el build si hay)
│  ├─ report.mjs             páginas por tipo, peso y JS
│  └─ test-docx.mjs          prueba del export Word en Node
├─ public/                   .htaccess (+ _astro/.htaccess), favicon
├─ src/
│  ├─ config/                ÚNICOS archivos editables de configuración
│  │  ├─ site.json           URL, libro (autores, DOI, licencia, cita), clave de almacenamiento
│  │  ├─ providers.json      ChatGPT / Claude / Gemini (URL, prellenado, límite de caracteres)
│  │  └─ variables-fallback.json  solo si falta capas/prompts/variables.json
│  ├─ data/                  instantánea de los JSON (generada por prebuild; se versiona para la CI)
│  ├─ lib/                   DATOS Y LÓGICA (sin HTML)
│  │  ├─ datos.ts            ÚNICO cargador: extracción + correcciones + visibilidad + capas → objetos resueltos
│  │  ├─ docx-export.js      export Word (navegador y Node)
│  │  ├─ seo.ts, texto.ts, slug.ts
│  ├─ client/                COMPORTAMIENTO en el navegador (ganchos data-js, sin estilos)
│  │  ├─ estado.ts           localStorage versionado, copia .json, anuncios aria-live
│  │  ├─ app.ts              modo global, progreso, copias, globos del glosario
│  │  ├─ prompt-card.ts      variables, copiar, abrir en IA, respuesta encadenada, anatomía
│  │  ├─ entregable.ts, filtro.ts, mi-proyecto.ts, mis-planes.ts
│  ├─ styles/
│  │  ├─ tokens.css          ÚNICO archivo de tokens (de investigacion/design.md)
│  │  └─ base.css            piel provisional sobria (clases c-*)
│  ├─ components/            PRESENTACIÓN: componentes pequeños que reciben props
│  ├─ layouts/Layout.astro   head SEO, sidebar (escritorio), tab bar (móvil), barra superior con modo
│  └─ pages/                 rutas (ver abajo)
```

### Rutas

`/` · `/planes/` · `/planes/[slug]/` · `/planes/[slug]/[paso]/` · `/planes/[slug]/cadena/[id]/` · `/prompts/` ·
`/prompts/[id]/` · `/herramientas/` · `/herramientas/[slug]/` · `/glosario/` · `/glosario/[slug]/` ·
`/antes-de-empezar/` · `/laboratorio-visual/` · `/mi-proyecto/` · `/mis-planes/` · `/acerca/` · `404.html` ·
`/sitemap.xml` · `/robots.txt` · `/llms.txt` · `/datos/planes.json` (datos para Mis planes).

## Dónde se conecta la piel de Google Stitch (P6)

1. **Tokens**: sustituir valores en `src/styles/tokens.css` (mismos nombres de variables).
2. **Componentes**: reescribir el marcado/estilos de `src/components/*.astro` y `src/layouts/Layout.astro`
   a partir del HTML exportado de Stitch, **conservando las props** que reciben y los atributos
   `data-js="…"`, `data-slot="…"`, `data-var`, `data-plan`, `data-paso`, `data-solo-modo` (son los ganchos de
   `src/client/`). Correspondencia con las pantallas del Anexo B v2:
   - P1 Inicio → `pages/index.astro` · P2 Catálogo → `pages/planes/index.astro` + `PlanCard.astro`
   - P3 Portada de plan → `pages/planes/[slug]/index.astro` + `PrereqBox.astro`
   - P4/P12 Paso → `pages/planes/[slug]/[paso].astro` + `PromptCard.astro`, `VideoSlot.astro`,
     `BookExample.astro`, `ToolCard.astro`, `SaveDeliverable.astro`, `SideNav.astro`
   - P5 Cadena → `pages/planes/[slug]/cadena/[id].astro` + `ChainTimeline.astro`
   - P6 Mi proyecto → `pages/mi-proyecto.astro` + `StorageNotice.astro`
   - P7 Mis planes → `pages/mis-planes.astro` (los `<template id="tpl-plan|tpl-entregable">` son la maqueta)
   - P8/P9 Herramientas → `pages/herramientas/*` · P10 → `pages/laboratorio-visual.astro` · P11 → `pages/glosario/*`
3. **Nunca** tocar `src/lib/` ni `src/data/` para cambiar el aspecto.

## Piel P6 (Stitch)

- Estilos: `src/styles/base.css` (CSS propio, sin Tailwind ni CDN) + tokens ampliados en `tokens.css`.
- Iconos: Material Symbols Rounded como sprite SVG propio `public/iconos.svg` (subconjunto generado por
  `../informes/scripts_p6/iconos.py`; licencia Apache 2.0 en `public/licencias/`). Uso: `<Icon nombre="…" relleno />`.
- `src/client/piel.ts`: estados de presentación calculados del estado local (proyecto activo, estado y CTA de cada
  plan, paso siguiente, nodos de cadena, valores de variables, anillo de completitud, chips de filtro → `<select>`).
- Columna derecha en escritorio: `.l-dos` / `.l-dos__main` / `.l-dos__aside` (≥ 1180 px).

## Tipografías

Inter y JetBrains Mono (variables, eje `wght`) se sirven desde `public/fonts/` (subconjuntos latin y latin-ext, de
`@fontsource-variable/*` 5.3.0) con su licencia SIL OFL 1.1 al lado (`Inter-OFL.txt`, `JetBrainsMono-OFL.txt`).
Los `@font-face` están en `src/styles/fonts.css`; los componentes solo usan `--font-sans` / `--font-mono` de `tokens.css`.

## Prompts propuestos por la plataforma (P2b)

`capas/prompts/prompts.json` → `prompts_propuestos` (ids `cNN-pNN-prop`) y campo `propuesta_plataforma` en el prompt
del libro. `datos.ts` los carga como `Prompt` con `es_propuesta`, `basado_en`, `cita_libro`, `aviso`. `PromptCard`
muestra, tras la descripción del libro (no copiable), la tarjeta propuesta con el distintivo «Propuesta de la
plataforma · pendiente de revisión» y la cita. En `/prompts/` hay filtro «Origen»; sus fichas son `noindex` y no van
al sitemap hasta que el autor las revise.

## Capas y marcadores

`datos.ts` aplica, en este orden: extracción → `capas/correcciones/correcciones.json` (por `archivo`+`ruta`;
si el fragmento no encaja se ignora y se registra en el log de build `[datos] …`) → `capas/herramientas/`
(visibilidad, alias_menciones, extra_herramientas) → `capas/prompts`, `capas/resumenes`, `capas/glosario`,
`capas/planes`. Si falta una pieza se muestra `[pendiente: …]` (función única `PENDIENTE()` en `datos.ts`).
El estado de cada capa se ve en `/acerca/` (desplegable técnico) y en la primera línea del log de build.
