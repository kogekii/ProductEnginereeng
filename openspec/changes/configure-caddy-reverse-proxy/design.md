# Design

## Context

Ver `proposal.md` para la motivación y el alcance. El Compose actual define PostgreSQL, pero no incluye la aplicación ni Caddy. El `Dockerfile` de producción expone Fastify en el puerto interno `3000`; el futuro hostname se configurará cuando el usuario habilite DuckDNS.

## Goals / Non-Goals

**Goals:**

- Proveer una ruta de despliegue Compose completa para que Caddy alcance la aplicación mediante la red interna.
- Hacer configurable el hostname sin codificar un dominio real ni credenciales en el repositorio.
- Mantener los datos ACME y configuración de Caddy en volúmenes persistentes.

**Non-Goals:**

- Registrar o actualizar el nombre en DuckDNS automáticamente.
- Ejecutar una integración DNS-01 o almacenar tokens DNS.
- Publicar PostgreSQL o el puerto de la aplicación directamente a Internet.
- Cambiar la configuración funcional de Fastify, React o la base de datos.

## Decisions

1. **Caddy termina TLS y hace proxy al servicio `app` en `app:3000`.** Docker DNS resuelve el nombre del servicio dentro de la red Compose; `localhost` dentro de Caddy no apunta a la aplicación. No se publicará el puerto 3000 al host.
2. **Usar un único Compose con perfil `production`.** PostgreSQL queda sin perfil para conservar `docker compose up -d` en desarrollo. `app` y `caddy` usan el perfil `production`; `docker compose --profile production up -d --build` levanta el stack completo en el VPS.
3. **Configurar el hostname mediante variable de entorno del Caddyfile.** El servicio Caddy requiere `APP_DOMAIN` desde el entorno del VPS/.env y el Caddyfile lo usa como dirección del sitio. Esto permite usar un hostname DuckDNS en el futuro sin editar la imagen ni guardar un dominio personal en Git.
4. **Publicar 80/TCP y 443/TCP, y persistir `/data` y `/config`.** Caddy necesita los puertos para los desafíos HTTP/TLS habituales y los volúmenes para conservar certificados y estado entre recreaciones.
5. **Incluir el servicio `app` en el Compose usando el Dockerfile del repositorio.** El servicio se construye localmente con `build: .`, usa el puerto interno 3000 y recibe variables requeridas para conectarse a PostgreSQL. El puerto 3000 no se publica en el host; PostgreSQL se publica solo en `127.0.0.1:5432` para desarrollo y administración local.
6. **No fijar un dominio de producción ni valores secretos.** `APP_DOMAIN`, `APP_URL`, `DATABASE_URL` y `SESSION_SECRET` se requieren en el despliegue de producción y se suministran por configuración local/servidor. Caddy no debe arrancar con un dominio ficticio.

Alternativas consideradas: publicar el puerto de Fastify y evitar reverse proxy (descartado por exponer directamente la aplicación y omitir la terminación TLS); usar `localhost:3000` (incorrecto entre contenedores); usar Docker Proxy dinámico con labels (descartado por agregar una imagen/plugin innecesario para un único servicio).

## Risks / Trade-offs

- [El DNS aún no apunta al VPS o los puertos están bloqueados] → Caddy no podrá emitir el certificado; documentar prerrequisitos y validar logs/estado tras configurar DuckDNS.
- [APP_DOMAIN está ausente o contiene un valor inválido] → el sitio no podrá servir HTTPS; hacerlo obligatorio en Compose y explicar el error de configuración.
- [El despliegue de producción requiere variables que no se necesitan en desarrollo] → aislar app/Caddy en el perfil `production` y documentar las variables necesarias sin agregar secretos al repositorio.
- [El Compose base publica 5432 para desarrollo] → conservar el flujo local documentado y usar solo el overlay en VPS; confirmar que el archivo de producción no contiene mapeo de ese puerto.

## Migration Plan

1. Configurar las variables requeridas del despliegue y el hostname cuando esté disponible.
2. Aplicar las migraciones de base de datos y construir/iniciar el perfil `production`; Caddy solicitará el certificado al ser accesible el dominio.
3. Verificar acceso HTTPS, proxy a Fastify y persistencia de certificados tras recrear Caddy.
4. Rollback: volver a la configuración Compose anterior; los volúmenes de Caddy se pueden conservar para un despliegue posterior.
