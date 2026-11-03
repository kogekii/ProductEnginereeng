# Proposal

## Why

La aplicación necesita un punto de entrada HTTPS en el VPS que reciba las solicitudes públicas y las reenvíe al contenedor Fastify. Configurar Caddy junto con Docker Compose permitirá publicar el sitio mediante un dominio, obtener y renovar certificados TLS automáticamente y conservarlos entre reinicios.

## What Changes

- Agregar Caddy al despliegue Docker Compose con los puertos HTTP/HTTPS necesarios y almacenamiento persistente para sus datos y configuración.
- Agregar un `Caddyfile` que aplique HTTPS y haga reverse proxy al servicio de aplicación por la red Docker.
- Documentar la configuración del dominio, variables requeridas y pasos de operación del despliegue.
- No exigir un dominio de pago; el despliegue usará un nombre DNS que resuelva al VPS, por ejemplo un subdominio DuckDNS cuando el usuario lo configure.

## Capabilities

### New Capabilities

Ninguna. Este cambio modifica infraestructura de despliegue y documentación operativa; no altera comportamiento funcional de la aplicación, por lo que declara `skip_specs: true`.

### Modified Capabilities

Ninguna.

## Impact

- `docker-compose.yml` y nuevo archivo `Caddyfile` o configuración equivalente montada por Compose.
- Documentación de despliegue del VPS y configuración del dominio.
- No se esperan cambios en API, modelo de datos, dependencias de aplicación ni reglas de negocio. No se implementará DNS dinámico ni integración específica con DuckDNS.
