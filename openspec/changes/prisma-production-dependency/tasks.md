# Tasks

## 1. Línea base y dependencia de producción

- [ ] 1.1 Ejecutar `corepack pnpm test`, `corepack pnpm typecheck` y `corepack pnpm build`; registrar fallos preexistentes y resultados.
- [ ] 1.2 Mover `prisma` de `devDependencies` a `dependencies` y actualizar el lockfile con pnpm; verificar consistencia con `corepack pnpm install --frozen-lockfile`.
- [ ] 1.3 Reconstruir la imagen Docker ARM64 y comprobar dentro de la imagen que `corepack pnpm exec prisma --version` encuentra el CLI de producción.

## 2. Verificación final

- [ ] 2.1 Ejecutar `corepack pnpm test`, `corepack pnpm typecheck`, `corepack pnpm build` y validar `prisma migrate deploy` desde el contenedor contra una base de prueba; revisar que solo cambió el empaquetado de Prisma.
