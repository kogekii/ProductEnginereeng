# Proposal

## Why

Hoy la imagen Docker se construye manualmente y no queda disponible para revisar cada Pull Request. Un workflow de GitHub Actions permitirá construirla automáticamente y publicar una etiqueta identificable en GHCR para los PRs que provienen de ramas del mismo repositorio.

## What Changes

- Agregar un workflow de GitHub Actions activado por cada Pull Request.
- Construir la imagen con el `Dockerfile` de la raíz.
- Publicar en GHCR con etiquetas que identifiquen el número del PR y el commit.
- Para PRs desde forks, construir la imagen pero no publicarla, debido a que GitHub limita los permisos de `GITHUB_TOKEN` en esos eventos.
- No usar `pull_request_target` ni solicitar secretos personales de registry.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

Ninguna.

## Impact

- Nuevo archivo `.github/workflows/docker-pr.yml`.
- GHCR recibirá una nueva versión de imagen para cada actualización de PR interno.
- Requiere que el workflow tenga `contents: read` y `packages: write`; no requiere secretos personales porque usa `GITHUB_TOKEN`.
- No afecta la aplicación, Compose, Caddy ni las reglas funcionales del producto.
