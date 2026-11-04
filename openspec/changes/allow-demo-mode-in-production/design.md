# Design

## Context

`src/server/config.ts` valida `DEMO_MODE` y `NODE_ENV` y actualmente lanza un error cuando demo está activo en producción. La prueba correspondiente está en `tests/server/app.test.ts`. El seed mantiene su propia protección para no cargar datos demo bajo producción.

## Goals / Non-Goals

**Goals:**
- Permitir que el modo demo se active durante una ejecución con `NODE_ENV=production`.
- Mantener la protección independiente que impide ejecutar el seed de demostración en producción.

**Non-Goals:**
- Cambiar el comportamiento del seed, la autenticación real, el almacenamiento de documentos o los permisos.
- Cambiar el valor de `NODE_ENV` a `development` para habilitar demo.

## Decisions

- Eliminar la validación cruzada que rechaza `DEMO_MODE=true` con `NODE_ENV=production`; conservar ambas variables tal como fueron configuradas. Alternativamente, se podría degradar el entorno a desarrollo, pero eso invalidaría la prueba del despliegue productivo solicitada.
- Actualizar la prueba de configuración para afirmar que la combinación se acepta y que los valores resultantes permanecen correctos.
- Alinear la documentación de producto y el README con el comportamiento. El cambio no requiere migraciones ni dependencias nuevas.

## Risks / Trade-offs

- [El acceso de demostración estará disponible en el despliegue productivo mientras se configure explícitamente] → Mantener `DEMO_MODE=false` como configuración normal de despliegue y activarlo solo para las pruebas solicitadas.
- [El seed podría confundirse con el permiso de ejecutar demo en producción] → Mantener su guardia explícita e independiente, sin alterarla.
