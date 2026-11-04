# Tasks

## 1. Línea base y despliegue

- [x] 1.1 Ejecutar `pnpm test`, `pnpm typecheck` y `pnpm build`; registrar en el resumen cuáles pasan o si algún script no está disponible. Línea base: `corepack pnpm typecheck` y `corepack pnpm build` pasan; `corepack pnpm test` falla en suites de integración porque `DATABASE_URL`/PostgreSQL no están disponibles (29 pasan, 7 fallan, 1 omitida).
- [x] 1.2 Consolidar PostgreSQL, `app` y Caddy en `docker-compose.yml`; mantener `app` y Caddy en el perfil `production`, conectar la app a PostgreSQL con healthcheck y validar con `docker compose config --quiet`. Validado con `wsl.exe docker compose config --quiet` usando variables de prueba no secretas.
- [x] 1.3 Configurar Caddy en el perfil `production` para publicar 80/443, depender de `app` y persistir `/data` y `/config`; eliminar `docker-compose.production.yml` y verificar el stack con `docker compose --profile production config --quiet`. La configuración con perfil pasó usando valores de prueba.

## 2. Configuración y documentación operativa

- [x] 2.1 Crear el `Caddyfile` parametrizado por `APP_DOMAIN` con proxy a `app:3000`; validar sintaxis con `caddy validate` usando la imagen/configuración de Caddy. `caddy validate` informó `Valid configuration`.
- [x] 2.2 Documentar requisitos DNS, puertos del firewall, variables de entorno, migración de la base de datos, puesta en marcha, comprobación HTTPS y recarga de Caddy; verificar que los comandos y rutas coincidan con Compose y el `Caddyfile` implementados.
- [x] 2.3 Verificar que `.env` y secretos no se agreguen al control de versiones ni queden embebidos en archivos de despliegue; comprobar con revisión de `git diff`. `.env` está ignorado por Git y no está versionado.

## 3. Verificación de integración

- [ ] 3.1 Ejecutar `pnpm test`, `pnpm typecheck` y `pnpm build`; revisar la configuración única de Compose y confirmar que el VPS no expone los puertos internos de app ni PostgreSQL. Typecheck y build pasan; 7 pruebas de integración fallan porque no hay `DATABASE_URL`/PostgreSQL disponible (29 pasan, 1 omitida). Las configuraciones Compose pasan con variables de prueba; app no publica 3000 y PostgreSQL solo se liga a `127.0.0.1`.
- [x] 3.2 Revisar las reglas y decisiones de `docs/00-producto.md` y confirmar que no se modificó comportamiento funcional ni se implementó integración automática con DuckDNS.
