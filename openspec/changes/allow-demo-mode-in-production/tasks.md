# Tasks

## 1. Línea base

- [x] 1.1 Ejecutar `corepack pnpm test`, `corepack pnpm typecheck` y `corepack pnpm build`; comprobar que los tres comandos terminan correctamente antes de modificar el código.

## 2. Permitir modo demo en producción

- [x] 2.1 Eliminar el rechazo de `DEMO_MODE=true` en producción desde `src/server/config.ts` y actualizar `tests/server/app.test.ts`; verificar que la prueba confirma el entorno `production` y `DEMO_MODE=true`.
- [x] 2.2 Alinear `docs/00-producto.md` y `README.md` con la nueva posibilidad de habilitar demo al probar despliegues de producción; verificar que no indiquen que la combinación está prohibida.
- [x] 2.3 Ejecutar `corepack pnpm test`, `corepack pnpm typecheck` y `corepack pnpm build`, y revisar que el seed siga bloqueado en producción y que no se contradigan las decisiones documentadas.
