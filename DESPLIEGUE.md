# Despliegue de lab.aulamarketing.digital

Sitio 100 % estático (Astro, `output: 'static'`, `build.format: 'directory'`, `base: '/'`).
Destino en Hostinger: `/home/u720704266/domains/aulamarketing.digital/public_html/lab`
(subdominio `lab.aulamarketing.digital`, dentro de la carpeta del WordPress).

## Flujo

```
repo GitHub ismaresearch/lab-aulamarketing (rama main)
   └─ push ─> GitHub Action .github/workflows/deploy.yml
                 npm ci → npm run build (prebuild + build + enlaces + informe) → npm run test:docx
                 └─ publica dist/ en la rama «deploy» (huérfana, solo el sitio compilado)
                        └─ Hostinger hPanel → Avanzado → Git → despliega «deploy» en public_html/lab
```

## Qué va en el repositorio

El repositorio debe contener el **contenido de esta carpeta `sitio/`** en su raíz (package.json, astro.config.mjs,
src/, public/, scripts/, .github/). `src/data/` se versiona: es la instantánea de `extraccion/` y `capas/` que copia
`scripts/prebuild.mjs`. En la CI no existe `../extraccion`, así que el prebuild conserva esa instantánea y compila con ella.

Para actualizar contenidos: en la máquina de trabajo (`/home/claude/libro/sitio`), `npm run build` (refresca
`src/data/` desde `../extraccion` y `../capas`), copiar la carpeta al clon del repo, commit y push a `main`.

## Pasos (una sola vez)

1. **GitHub**: en el repo, *Settings → Actions → General → Workflow permissions* → «Read and write permissions»
   (la Action escribe la rama `deploy`). El primer push a `main` crea la rama.
2. **Hostinger** (hPanel → Sitios web → aulamarketing.digital → Avanzado → **Git**):
   - Repositorio: `https://github.com/ismaresearch/lab-aulamarketing.git` (si es privado, añade la clave SSH
     de despliegue que muestra hPanel en *GitHub → Settings → Deploy keys*, solo lectura, y usa la URL SSH).
   - Rama: `deploy`.
   - Directorio: `public_html/lab` (debe estar **vacío** antes del primer despliegue).
   - Activa *Despliegue automático* y copia la URL del webhook en *GitHub → Settings → Webhooks*
     (evento *push*). Así cada publicación de la Action se despliega sola.
3. **Subdominio**: hPanel → Dominios → Subdominios → `lab` con carpeta `public_html/lab`. SSL activado para el
   subdominio.

## `.htaccess` (incluido en `public/`, se copia a la raíz de `dist/`)

- (a) `RewriteEngine On` propio sin `RewriteOptions Inherit` → no se heredan las reglas de WordPress del padre.
- (b) `aulamarketing.digital/lab/…` → 301 a `https://lab.aulamarketing.digital/…`; además fuerza HTTPS.
- (c) `ErrorDocument 404 /404.html`.
- (d) HTML/JSON/XML/TXT con `no-cache`; `/_astro/` (assets con hash) con `max-age=31536000, immutable`
  mediante `public/_astro/.htaccess`.
- (e) `DirectoryIndex index.html`, `Options -Indexes`.

Comprobaciones tras el primer despliegue: `/`, una ruta sin barra final (`/planes/seo` → 301 a `/planes/seo/`),
`/no-existe/` (404 propio), `https://aulamarketing.digital/lab/planes/` (301 al subdominio), que el WordPress
principal sigue funcionando, y las cabeceras `Cache-Control` (`curl -I`).

## Nota

Este proceso (P4) no ha creado repositorios ni hecho push: solo deja el workflow y esta guía.
