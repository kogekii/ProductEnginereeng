# Tasks

## 1. Línea base y Dockerfile

- [x] 1.1 Ejecutar `pnpm test`, `pnpm typecheck` y `pnpm build` antes del cambio; registrar si alguna herramienta no está disponible y guardar los resultados de referencia.
- [x] 1.2 Crear el `Dockerfile` multi-stage descrito en `design.md`, incluyendo instalación congelada con pnpm, generación de Prisma Client, build de servidor/cliente y usuario no privilegiado en runtime; verificar que `docker build` complete desde la raíz.
- [x] 1.3 Ejecutar la imagen con configuración de producción y `DATABASE_URL` externo, y verificar que Fastify arranque y `GET /api/health` responda correctamente sin incluir secretos en la imagen.

## 2. Verificación final

- [x] 2.1 Ejecutar `pnpm test`, `pnpm typecheck` y `pnpm build`; revisar que el Dockerfile no cambie las reglas de negocio ni decisiones de `docs/00-producto.md`.

### Línea base — 2026-11-03

- `pnpm` no está directamente en PATH; se usó `corepack pnpm` (pnpm 10.12.1 según `package.json`).
- `corepack pnpm test`: falló en 7 pruebas de integración por falta de `DATABASE_URL`; 29 pruebas pasaron y 1 quedó omitida. Los fallos de autenticación relacionados ocurren en las mismas pruebas sin base configurada.
- `corepack pnpm typecheck`: pasó.
- `corepack pnpm build`: pasó; Vite informó únicamente que el bundle JavaScript supera el umbral de 500 kB.
- `wsl.exe docker version`: Docker Engine disponible (Linux amd64).
- Imagen `school-authorizations-app:local`: build pasó; el contenedor arrancó como usuario `node` (UID 1000), creó `/app/data/uploads`, no contenía `/app/.env` y `GET /api/health` respondió `{"status":"ok"}`. Se usó una URL de PostgreSQL de prueba y no se ejecutaron rutas que requirieran conexión a la base.
- El primer intento de arranque reveló que `package.json#start` apunta a un archivo distinto al emitido por `tsconfig.server.json`; el Dockerfile arranca `dist/server/server/server.js` sin modificar el script del proyecto.
- Verificación final: con una instancia PostgreSQL 17 desechable, migración y seed aplicados, `corepack pnpm test` pasó 37/37; `corepack pnpm typecheck` y `corepack pnpm build` pasaron.
