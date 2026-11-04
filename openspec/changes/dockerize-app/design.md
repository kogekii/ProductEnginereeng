# Design

## Context

Ver `proposal.md` para la motivación y el alcance. La aplicación ya compila el servidor en `dist/server`, el cliente en `dist/client`, y Fastify sirve ese cliente en producción. El proyecto declara Node.js 24 o superior, pnpm y Prisma.

## Goals / Non-Goals

**Goals:**

- Crear una imagen reproducible de producción para la aplicación completa, conservando un solo proceso Fastify que sirve la API y el build React.
- Mantener en la imagen final solo runtime y artefactos necesarios para ejecutar el servidor.
- Aceptar configuración y secretos desde el entorno al ejecutar el contenedor.

**Non-Goals:**

- Definir servicios Docker Compose, Caddy, TLS, PostgreSQL o almacenamiento persistente.
- Ejecutar migraciones o seed automáticamente al arrancar.
- Cambiar scripts, dependencias, código de aplicación o el flujo de desarrollo local.

## Decisions

### Build multi-stage con pnpm y Node.js 24

El Dockerfile usará etapas separadas para instalar dependencias y compilar, y una etapa final de runtime basada en Node.js 24. La instalación respetará `pnpm-lock.yaml` con modo frozen; Prisma Client se generará a partir de `prisma/schema.prisma` antes del build. La etapa final incluirá el cliente generado, dependencias de producción, `dist/server`, `dist/client` y los artefactos Prisma que Prisma Client necesita en runtime.

Alternativas consideradas:

- Imagen de una sola etapa: más simple, pero deja herramientas y dependencias de desarrollo innecesarias en la imagen de producción.
- Instalar dependencias sin lockfile estricto: puede producir imágenes distintas entre builds, por lo que se descarta.

### Arranque con el script existente

La imagen ejecutará con Node el artefacto compilado `dist/server/server/server.js`, con `NODE_ENV=production` y un usuario no privilegiado. El script `start` actual apunta a `dist/server/server.js`, ruta distinta a la que genera el `tsconfig.server.json`; este change no modifica `package.json` y usa la ruta real emitida por el build. El puerto será configurable mediante `PORT`; la base URL y secretos se inyectarán al contenedor y no se copiarán desde `.env`.

Alternativas consideradas:

- Cambiar `package.json` para introducir un entrypoint nuevo: innecesario porque existe `start`.
- Iniciar como root: se descarta por privilegio innecesario.

## Risks / Trade-offs

- **Dependencias nativas de Prisma no coinciden con la plataforma de runtime** → usar la misma familia de imagen Node en etapas de build y ejecución, y validar un build/arranque real de la imagen en el entorno Docker disponible.
- **Archivos de Prisma Client/schema/migraciones faltantes en runtime** → copiar explícitamente los artefactos requeridos y validar el comando de build y arranque; la ejecución de migraciones sigue siendo responsabilidad operativa externa.
- **Build context incluye archivos locales o secretos** → no copiar `.env`; comprobar que la receta copia solo artefactos necesarios. Agregar `.dockerignore` queda fuera del alcance de este change salvo que sea indispensable para que el build funcione.

## Migration Plan

No hay migración de datos ni cambio de infraestructura existente. Construir la imagen desde la raíz del repositorio, ejecutarla con variables de entorno requeridas y `DATABASE_URL` apuntando a una instancia PostgreSQL externa al contenedor, y comprobar `GET /api/health`. Para volver atrás, seguir usando la ejecución local actual; el Dockerfile no altera datos persistentes.

## Open Questions

Ninguna.
