# Proposal

## Why

Se necesita probar el despliegue real con `NODE_ENV=production` y mantener habilitado el acceso de demostración. Actualmente la configuración rechaza expresamente esa combinación e impide validar la web desplegada en producción.

## What Changes

- Permitir `DEMO_MODE=true` junto con `NODE_ENV=production` al cargar la configuración del servidor.
- Mantener `NODE_ENV=production` para que la aplicación sirva la web con su configuración de producción.
- Actualizar la documentación de producto que actualmente declara incompatible el modo demo con producción.

## Capabilities

### New Capabilities

- `demo-mode`: comportamiento de la aplicación cuando el modo de demostración está habilitado, incluso en producción.

### Modified Capabilities

Ninguna.

## Impact

- `src/server/config.ts` y sus pruebas de configuración.
- `docs/00-producto.md` y las instrucciones de despliegue del `README.md`.
- No se cambia el seed ni se habilita su ejecución en producción.
