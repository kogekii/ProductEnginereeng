# Proposal

## Why

El repositorio ya contiene una aplicación ejecutable y PostgreSQL configurado en Docker Compose, pero no puede producir una imagen de la aplicación porque falta un `Dockerfile`. Agregar una receta reproducible de producción permite construir y ejecutar el monolito como contenedor, manteniendo la base de datos como servicio separado.

## What Changes

- Agregar un `Dockerfile` multi-stage que instale dependencias reproducibles con pnpm, genere Prisma Client, compile el servidor y el cliente web, y ejecute el servidor Fastify en la imagen final.
- Mantener la imagen de aplicación independiente de PostgreSQL y Caddy; la configuración de Compose, proxy/TLS, migraciones automáticas, healthchecks y cambios de código quedan fuera de este change.
- Tratar la construcción de imagen como tooling de despliegue sin cambio de comportamiento funcional; por eso este change no introduce ni modifica capacidades funcionales.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

Ninguna.

## Impact

- Nuevo archivo `Dockerfile` en la raíz del repositorio.
- Usa `package.json`, `pnpm-lock.yaml`, `prisma/schema.prisma` y los scripts actuales `build` y `start`.
- No agrega dependencias ni cambia APIs, modelo de datos o variables de entorno de la aplicación.
- Validación prevista: construir la imagen y comprobar que el contenedor arranca con variables de entorno proporcionadas al ejecutar; ejecutar además `pnpm test`, `pnpm typecheck` y `pnpm build` como verificaciones del proyecto.
