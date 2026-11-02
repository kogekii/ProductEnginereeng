# Plataforma de autorizaciones del colegio

Aplicación web mobile-first para autorizaciones de eventos y gestión administrativa.

## Desarrollo

1. Instala Node.js 24 o superior y Corepack.
2. Ejecuta `corepack pnpm install`.
3. Copia `.env.example` a `.env` y revisa los valores de desarrollo.
4. Levanta PostgreSQL con `docker compose up -d`.
5. Ejecuta `corepack pnpm db:migrate` y `corepack pnpm db:seed`.
6. Inicia la aplicación con `corepack pnpm dev` y abre <http://localhost:5173>.

> Si Docker solo está disponible desde WSL, abre el repositorio en una terminal WSL y ejecuta allí `docker compose up -d`. La base queda disponible en `localhost:5432` para los comandos de Node.

Comprobaciones: `corepack pnpm test`, `corepack pnpm typecheck`, `corepack pnpm build` y `corepack pnpm lint`.

El modo demostración está destinado solo al entorno local. La aplicación rechaza iniciar con `DEMO_MODE=true` en producción.
