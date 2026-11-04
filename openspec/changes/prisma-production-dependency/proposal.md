# Proposal

## Why

La imagen de producción no incluye el ejecutable de Prisma porque `pnpm prune --prod` elimina Prisma CLI, actualmente declarada como dependencia de desarrollo. Esto impide ejecutar `prisma migrate deploy` desde el contenedor de aplicación al desplegar.

## What Changes

- Mover `prisma` desde `devDependencies` a `dependencies`, conservando la versión y el lockfile sincronizado.
- Verificar que la instalación de producción conserve el ejecutable `prisma` para ejecutar migraciones desde el contenedor.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

Ninguna. Es un cambio de empaquetado y dependencias; no modifica comportamiento funcional de la plataforma.

## Impact

- `package.json` y `pnpm-lock.yaml`.
- La imagen Docker de producción tendrá Prisma CLI entre sus dependencias de runtime y podrá ejecutar `pnpm db:migrate`.
- No cambia el schema, las migraciones, APIs ni reglas de negocio.
