# Tasks

## 1. Línea base y workflow

- [x] 1.1 Ejecutar `pnpm test`, `pnpm typecheck` y `pnpm build` antes de agregar el workflow; registrar los resultados.
- [x] 1.2 Crear `.github/workflows/docker-pr.yml` para construir en cada Pull Request y publicar en GHCR solo los PRs internos; verificar sintaxis con `actionlint` y revisar que los forks no tengan acceso de escritura ni se use `pull_request_target`.
- [x] 1.3 Verificar que la etiqueta incluya el número del PR y el SHA del commit, y que el login use `GITHUB_TOKEN`; validar el build de la imagen con `wsl.exe docker build -t school-authorizations-app:pr-check .`.

## 2. Verificación final

- [x] 2.1 Ejecutar `pnpm test`, `pnpm typecheck` y `pnpm build`, y validar el change con `openspec validate "publish-pr-images"`.

### Línea base — 2026-11-03

- `pnpm` no está directamente en PATH; se usó `corepack pnpm`.
- `corepack pnpm test`: 29 pasaron y 1 quedó omitida; 7 pruebas de integración fallaron porque no había `DATABASE_URL` ni PostgreSQL configurado.
- `corepack pnpm typecheck`: pasó.
- `corepack pnpm build`: pasó; Vite informó que el bundle JavaScript supera el umbral de 500 kB.
- `actionlint` no está instalado en el entorno local.
- El workflow pasó `actionlint` ejecutado como contenedor de Docker; no usa `pull_request_target`, publica solo cuando el repo de origen coincide con el repo base y la etiqueta usa `pr-<número>-<SHA>`.
- `wsl.exe docker build -t school-authorizations-app:pr-check .`: pasó.
- Verificación final con PostgreSQL 17 temporal y seed: `corepack pnpm test` pasó 37/37; `corepack pnpm typecheck` y `corepack pnpm build` pasaron; `openspec validate "publish-pr-images"` pasó.
