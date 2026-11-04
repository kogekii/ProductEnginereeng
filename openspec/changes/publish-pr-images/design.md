# Design

## Context

Ver `proposal.md` para la motivación y el alcance. El repositorio ya tiene un Dockerfile multi-stage que construye la aplicación completa desde la raíz; no existen workflows bajo `.github/workflows/`.

## Goals / Non-Goals

**Goals:**

- Construir el Dockerfile en cada evento `pull_request`.
- Publicar la imagen del PR en GHCR solo cuando la rama de origen pertenece al mismo repositorio.
- Etiquetar cada publicación con el número del PR y el SHA del commit para distinguir actualizaciones.
- Mantener la construcción de PRs desde forks sin privilegios de publicación.

**Non-Goals:**

- Publicar versiones de release o imágenes `latest`.
- Desplegar la imagen, modificar Docker Compose o ejecutar migraciones.
- Usar secretos personales, `pull_request_target` o ejecutar código de forks con permisos de escritura.

## Decisions

### Evento pull_request y permiso mínimo explícito

El workflow se activa con `pull_request`, sin limitar la rama destino, para cubrir todos los PRs. Declara `contents: read` y `packages: write`, necesarios para checkout y publicación con `GITHUB_TOKEN`.

Alternativa descartada: `pull_request_target`; puede exponer el token con permisos de escritura al código no confiable si se construye el Dockerfile proveniente del PR.

### Construir todos los PRs y publicar solo los del repositorio base

El paso de login y el atributo `push` se condicionan a que `pull_request.head.repo.full_name` coincida con `github.repository`. Así los PRs de forks se validan construyendo, sin intentar publicar con un token que GitHub entrega como read-only.

Alternativa descartada: omitir todos los PRs de forks. El build sigue siendo una validación útil y no requiere acceso privilegiado.

### GHCR con etiqueta por PR y commit

La imagen usa `ghcr.io/<owner>/<repository>` en minúsculas y la etiqueta `pr-<número>-<sha>`. La autenticación usa el `GITHUB_TOKEN` del workflow; el paquete puede requerir que se habilite el acceso de GitHub Actions en sus permisos.

Alternativa descartada: Docker Hub con secretos de usuario; GHCR reduce credenciales externas y queda asociado al repositorio.

## Risks / Trade-offs

- **El paquete GHCR no autoriza el repositorio a publicar** → habilitar el acceso del repositorio en los permisos del paquete o publicar una primera versión y vincularla al repositorio.
- **Cada actualización de PR deja una versión publicada** → el SHA en la etiqueta evita sobrescribir imágenes, pero las versiones antiguas deberán limpiarse según la política del paquete.
- **Fork PR no deja imagen remota** → su workflow construye la imagen localmente en el runner; no se conceden permisos para escribir en GHCR.

## Migration Plan

Agregar `.github/workflows/docker-pr.yml` y subirlo al repositorio. Abrir o actualizar un PR para verificar el build; confirmar en Packages que un PR interno publicó su etiqueta `pr-...`. No requiere migración ni rollback de datos; deshabilitar o eliminar el workflow detiene futuras publicaciones.

## Open Questions

Ninguna.
