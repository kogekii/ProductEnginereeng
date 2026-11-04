# Tasks

## 1. Línea base y dependencia de producción

- [x] 1.1 Ejecutar `corepack pnpm test`, `corepack pnpm typecheck` y `corepack pnpm build`; registrar fallos preexistentes y resultados.
- [x] 1.2 Mover `prisma` de `devDependencies` a `dependencies` y actualizar el lockfile con pnpm; verificar consistencia con `corepack pnpm install --frozen-lockfile`.
- [x] 1.3 Reconstruir la imagen Docker ARM64 y comprobar dentro de la imagen que `corepack pnpm exec prisma --version` encuentra el CLI de producción.
- [x] 1.4 Mover `tsx` a `dependencies` y actualizar el lockfile; verificar con `corepack pnpm install --frozen-lockfile`.
- [ ] 1.5 Comprobar en el Dockerfile que el runtime conserva `node_modules/.bin/prisma`, `node_modules/.bin/tsx`, `prisma/seed.ts` y al menos una migración; verificar reconstruyendo la imagen ARM64.
- [ ] 1.6 Actualizar `.github/workflows/docker-pr.yml` para publicar también `:latest` en `push` a la rama principal y conservar las publicaciones PR; validar sintaxis del workflow y etiquetas resultantes.

## 2. Verificación final

- [ ] 2.1 Ejecutar `corepack pnpm test`, `corepack pnpm typecheck` y `corepack pnpm build`; registrar el estado final y verificar que los cambios ajenos al empaquetado no se alteraron.
- [ ] 2.2 Contra una base PostgreSQL temporal, ejecutar `corepack pnpm db:migrate` y luego `corepack pnpm db:seed` desde la imagen con `NODE_ENV=development` y `DEMO_MODE=true`; comprobar que se crean registros de demostración y que el seed no se ejecuta con `NODE_ENV=production`.
- [ ] 2.3 Validar el workflow con publicación desde la rama principal y verificar que GHCR recibe `:latest` para la imagen multi-arquitectura ARM64/AMD64.

### Línea base — 2026-11-03

- `corepack pnpm test`: pasó, 48/48 tests.
- `corepack pnpm typecheck`: pasó.
- `corepack pnpm build`: pasó; Vite reportó el aviso ya existente de bundle JavaScript mayor a 500 kB.

### Verificación de imagen — 2026-11-03

- `wsl.exe docker buildx build --platform linux/arm64 --load -t school-authorizations-app:prisma-production .`: pasó.
- Dentro del runtime ARM64, `corepack pnpm exec prisma --version`: Prisma CLI 6.19.3 disponible.
- `corepack pnpm db:migrate` desde el contenedor: aplicó las dos migraciones correctamente a una instancia PostgreSQL 17 desechable y aislada.

### Verificación final pendiente

- `corepack pnpm typecheck` y `corepack pnpm build`: pasaron.
- `corepack pnpm test`: 49/50 pasaron; falla `tests/integration/pickups.test.ts` al esperar un conflicto 409 (recibió respuestas 400/201/200 en una ejecución y 500 en una ejecución aislada). Esta prueba y la implementación de retiros pertenecen a cambios locales ajenos a este ajuste de dependencias; no se modificaron aquí. La tarea final queda abierta hasta contar con una corrida completa verde.

### Bloqueo actual de la imagen — 2026-11-03

- Al reconstruir `linux/arm64` después de mover `tsx`, `pnpm build` dentro del Dockerfile falla en Vite: no resuelve la importación `../features/pickups/AdminPickupPages.js` desde `src/client/routes/App.tsx`. El archivo local `src/client/features/pickups/AdminPickupPages.tsx` existe y el build local de Windows pasa; el error ocurre en el build Linux. No se modificó ese módulo, que pertenece a los cambios locales del flujo de retiros y queda fuera de este change.
