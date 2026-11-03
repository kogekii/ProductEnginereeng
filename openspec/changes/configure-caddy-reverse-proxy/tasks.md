# Tasks

## 1. Línea base y despliegue

- [x] 1.1 Ejecutar `pnpm test`, `pnpm typecheck` y `pnpm build`; registrar en el resumen cuáles pasan o si algún script no está disponible. Línea base: `corepack pnpm typecheck` y `corepack pnpm build` pasan; `corepack pnpm test` falla en suites de integración porque `DATABASE_URL`/PostgreSQL no están disponibles (29 pasan, 7 fallan, 1 omitida).
- [ ] 1.2 Revisar los servicios y variables actuales y agregar `docker-compose.production.yml` para que `app` se construya desde el Dockerfile, sea alcanzable en `app:3000` y se conecte a PostgreSQL sin romper el Compose base de desarrollo; verificar ambos archivos con `docker compose config` y, cuando existan variables válidas, con `docker compose up`.
- [ ] 1.3 Configurar Caddy en el overlay de producción para publicar 80/443, depender de `app` y persistir `/data` y `/config`; verificar la configuración renderizada con ambos archivos Compose.

## 2. Configuración y documentación operativa

- [ ] 2.1 Crear el `Caddyfile` parametrizado por `APP_DOMAIN` con proxy a `app:3000`; validar sintaxis con `caddy validate` usando la imagen/configuración de Caddy.
- [x] 2.2 Documentar requisitos DNS, puertos del firewall, variables de entorno, migración de la base de datos, puesta en marcha, comprobación HTTPS y recarga de Caddy; verificar que los comandos y rutas coincidan con Compose y el `Caddyfile` implementados.
- [x] 2.3 Verificar que `.env` y secretos no se agreguen al control de versiones ni queden embebidos en archivos de despliegue; comprobar con revisión de `git diff`. `.env` está ignorado por Git y no está versionado.

## 3. Verificación de integración

- [ ] 3.1 Ejecutar `pnpm test`, `pnpm typecheck` y `pnpm build`; revisar la configuración base y la combinación de Compose de producción y confirmar que el VPS no expone los puertos internos de app ni PostgreSQL.
- [x] 3.2 Revisar las reglas y decisiones de `docs/00-producto.md` y confirmar que no se modificó comportamiento funcional ni se implementó integración automática con DuckDNS.
