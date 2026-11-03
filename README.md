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

## Despliegue de producción en VPS

El despliegue público usa `docker-compose.yml` junto con `docker-compose.production.yml`. El primero mantiene PostgreSQL y su puerto de desarrollo ligado solo a `127.0.0.1`; el segundo añade la aplicación y Caddy. El puerto 3000 de la aplicación y PostgreSQL no se publican en la interfaz pública.

### Requisitos

- Un nombre DNS (por ejemplo, un subdominio de DuckDNS) cuyo registro A apunte a la IP pública del VPS. DuckDNS se configura por separado; la aplicación no actualiza DNS.
- Puertos TCP 80 y 443 permitidos en el firewall del proveedor y del VPS. Se publica también UDP 443 para HTTP/3.
- Docker Engine con el plugin Compose.
- Un archivo `.env` en el directorio de despliegue, no versionado, con:

```dotenv
POSTGRES_USER=usuario_de_base
POSTGRES_PASSWORD=contraseña_segura
POSTGRES_DB=colegio
APP_DOMAIN=colegio.duckdns.org
APP_URL=https://colegio.duckdns.org
DATABASE_URL=postgresql://usuario_de_base:contraseña_url_codificada@postgres:5432/colegio
SESSION_SECRET=secreto_largo_aleatorio
```

Codifica los caracteres reservados de la contraseña como URL percent-encoding dentro de `DATABASE_URL`. No reutilices los valores de ejemplo ni subas `.env` al repositorio. `APP_DOMAIN` debe ser el mismo hostname configurado en `APP_URL` y en el registro DNS.

### Primera puesta en marcha

Desde el directorio del repositorio en el VPS:

```bash
docker compose -f docker-compose.yml -f docker-compose.production.yml config
docker compose -f docker-compose.yml up -d postgres
```

Antes de iniciar la aplicación, aplica las migraciones desde el repositorio en el VPS con Corepack/pnpm y un `DATABASE_URL` temporal que use `localhost:5432` (el mapeo de PostgreSQL está limitado al loopback del VPS). El siguiente comando carga las variables del `.env` en la sesión y cambia solo el host para esta ejecución:

```bash
set -a
source .env
set +a
DATABASE_URL="${DATABASE_URL/@postgres:5432/@localhost:5432}" corepack pnpm db:migrate
```

Luego construye e inicia la aplicación y Caddy:

```bash
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.production.yml logs -f caddy
```

Cuando DNS resuelva al VPS y 80/443 sean accesibles, Caddy solicitará y renovará automáticamente el certificado. Comprueba el sitio en `https://<APP_DOMAIN>` reemplazando `<APP_DOMAIN>` por el hostname real. Los certificados y los documentos subidos sobreviven a la recreación de sus contenedores mediante volúmenes Docker.

Tras modificar `Caddyfile`, valida y recarga la configuración:

```bash
docker compose -f docker-compose.yml -f docker-compose.production.yml exec caddy caddy validate --config /etc/caddy/Caddyfile
docker compose -f docker-compose.yml -f docker-compose.production.yml exec caddy caddy reload --config /etc/caddy/Caddyfile
```

Comprobaciones: `corepack pnpm test`, `corepack pnpm typecheck`, `corepack pnpm build` y `corepack pnpm lint`.

El modo demostración está destinado solo al entorno local. La aplicación rechaza iniciar con `DEMO_MODE=true` en producción.
