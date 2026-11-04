# Design

## Context

Consulta `proposal.md` para la causa y el objetivo. La imagen se construye con una instalación completa y luego ejecuta `pnpm prune --prod`. `prisma` ya está en `dependencies`, mientras que el seed `prisma/seed.ts` se ejecuta mediante `tsx`, todavía clasificado como dependencia de desarrollo. El workflow publica `:latest` al procesar Pull Requests internos y no se ejecuta con pushes a la rama principal.

## Goals / Non-Goals

**Goals:**

- Conservar Prisma CLI al podar las dependencias de desarrollo de la imagen.
- Conservar `tsx` y el seed junto con schema y migraciones en runtime.
- Actualizar `:latest` desde pushes a la rama principal para publicar los cambios integrados.
- Mantener fija la versión efectiva de Prisma y sincronizar el lockfile.

**Non-Goals:**

- Ejecutar migraciones automáticamente al iniciar la aplicación.
- Cambiar Docker Compose, las migraciones existentes o las reglas de seguridad del seed.
- Alterar comportamiento funcional, esquema de datos o decisiones de producto.

## Decisions

- Mover la entrada existente `prisma` a `dependencies` sin cambiar su rango de versión (`^6.19.0`). Esto permite que la instalación de producción y `pnpm prune --prod` incluyan el CLI en la imagen final.
- Mover `tsx` a `dependencies` conservando `^4.20.6`, porque `db:seed` y `package.json#prisma.seed` invocan `tsx prisma/seed.ts`. El Dockerfile ya copia todo `prisma/`; agregar una comprobación de build que falle si faltan `node_modules/.bin/prisma`, `node_modules/.bin/tsx`, `prisma/seed.ts` o las migraciones.
- Regenerar el lockfile con pnpm/Corepack según `packageManager` en `package.json`, y verificar con instalación congelada para evitar inconsistencias.
- No agregar un script nuevo: `db:migrate` ya ejecuta `prisma migrate deploy`; mantener ese comando existente evita duplicar configuración.
- Alternativa descartada: copiar manualmente el binario o `node_modules/.bin/prisma` entre etapas, porque omite el grafo de dependencias del CLI y es más frágil.
- Ampliar el workflow existente para que procese `push` a la rama principal y publique `:latest`; conservar el build multi-arquitectura y los tags de PR existentes.
- Probar seed con `NODE_ENV=development` y `DEMO_MODE=true`. El seed contiene una guarda intencional que impide la carga de datos demo con `NODE_ENV=production`; no se modifica esa protección ni se habilita el seed al arranque.

## Risks / Trade-offs

- La imagen final aumenta de tamaño al incluir Prisma CLI y sus dependencias → es un costo aceptado para poder ejecutar migraciones desde el contenedor; la instalación de desarrollo se sigue podando.
- `db:seed` podría fallar si se copia el archivo pero falta el ejecutor → mantener `tsx` en runtime y comprobar CLI, ejecutor y seed después de la poda.
- La prueba del seed podría modificar datos reales → ejecutarla exclusivamente contra una base desechable; el seed de demo se mantiene prohibido en producción.
- `:latest` podría seguir siendo sobrescrito por un PR → conservar el etiquetado PR actual y añadir publicación al integrar a la rama principal; confirmar la etiqueta generada en GHCR antes de actualizar el servidor.

## Migration Plan

Conservar `prisma` y `tsx` en dependencias de producción, actualizar `pnpm-lock.yaml`, comprobar los artefactos del runtime y extender el workflow para publicar al actualizar la rama principal. Construir/verificar la imagen ARM64; probar migración y seed en una base desechable. Tras publicar y confirmar `:latest` en GHCR, el servidor debe descargar esa etiqueta y ejecutar `corepack pnpm db:migrate`; ejecutar `corepack pnpm db:seed` solo con `NODE_ENV=development` y `DEMO_MODE=true`, cuando se desean los datos de demostración. Si falla el despliegue, volver a la imagen anterior; no se cambia el esquema ni se aplican migraciones de forma automática.
