# Proposal

## Why

La etiqueta de despliegue `:latest` aún puede apuntar a una imagen anterior que no incluya Prisma CLI, y el workflow actual solo publica imágenes en eventos `pull_request`. Además, aunque el Dockerfile copia `prisma/seed.ts`, `pnpm prune --prod` elimina `tsx`, el ejecutor requerido por el comando de seed.

## What Changes

- Mantener `prisma` en `dependencies` y mover `tsx` a dependencias de producción, conservando sus versiones y sincronizando el lockfile.
- Verificar en la imagen final que estén disponibles los ejecutables de Prisma y `tsx`, además de `prisma/seed.ts` y sus migraciones.
- Publicar `:latest` también cuando se actualice la rama principal; mantener las etiquetas identificables de Pull Request.
- Validar `db:migrate` y `db:seed` desde la imagen contra una base temporal usando `NODE_ENV=development` y `DEMO_MODE=true` para el seed.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

Ninguna. Es un cambio de empaquetado y dependencias; no modifica comportamiento funcional de la plataforma.

## Impact

- `package.json`, `pnpm-lock.yaml`, `Dockerfile` y `.github/workflows/docker-pr.yml`.
- La imagen de despliegue tendrá Prisma CLI, `tsx`, seed y migraciones disponibles tras podar dependencias de desarrollo.
- El workflow actualizará `:latest` en publicación desde la rama principal y conservará las etiquetas por PR.
- No cambia el schema, las migraciones, APIs ni reglas de negocio.
