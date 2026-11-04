# Design

## Context

Consulta `proposal.md` para la causa y el objetivo. La imagen se construye con una instalación completa y luego ejecuta `pnpm prune --prod`; actualmente `prisma` está en `devDependencies`, por lo que no queda instalado en runtime.

## Goals / Non-Goals

**Goals:**

- Conservar Prisma CLI al podar las dependencias de desarrollo de la imagen.
- Mantener fija la versión efectiva de Prisma y sincronizar el lockfile.

**Non-Goals:**

- Ejecutar migraciones automáticamente al iniciar la aplicación.
- Cambiar Docker Compose, las migraciones existentes o el flujo de CI.
- Alterar comportamiento funcional, esquema de datos o decisiones de producto.

## Decisions

- Mover la entrada existente `prisma` a `dependencies` sin cambiar su rango de versión (`^6.19.0`). Esto permite que la instalación de producción y `pnpm prune --prod` incluyan el CLI en la imagen final.
- Regenerar el lockfile con pnpm/Corepack según `packageManager` en `package.json`, y verificar con instalación congelada para evitar inconsistencias.
- No agregar un script nuevo: `db:migrate` ya ejecuta `prisma migrate deploy`; mantener ese comando existente evita duplicar configuración.
- Alternativa descartada: copiar manualmente el binario o `node_modules/.bin/prisma` entre etapas, porque omite el grafo de dependencias del CLI y es más frágil.

## Risks / Trade-offs

- La imagen final aumenta de tamaño al incluir Prisma CLI y sus dependencias → es un costo aceptado para poder ejecutar migraciones desde el contenedor; la instalación de desarrollo se sigue podando.
- El ejecutable podría funcionar localmente pero faltar en la imagen → validar build de producción e invocación de `prisma migrate deploy` dentro del contenedor, además de la instalación con lockfile congelado.

## Migration Plan

Mover la dependencia, actualizar `pnpm-lock.yaml`, reconstruir y publicar la imagen ARM64 y luego desplegarla. Antes de desplegar la aplicación, ejecutar `corepack pnpm db:migrate` dentro del contenedor conectado a PostgreSQL. Si falla el despliegue, volver a la imagen anterior; este ajuste no cambia las migraciones ni aplica cambios a la base por sí mismo.
