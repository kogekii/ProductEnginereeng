# Recetas de componentes

Clases de referencia para el stack objetivo (React + Tailwind + shadcn/ui). Los nombres de token vienen de `tokens.md`. Si el scaffold usa otra convención, conserva la apariencia, no copies la clase.

---

## Botón

Base común: alto mínimo 48 px, `rounded-full`, `font-bold`, transición de 150 ms, foco visible, `disabled` con opacidad y sin sombra.

```tsx
const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 " +
  "text-base font-bold transition-colors duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-surface " +
  "disabled:pointer-events-none disabled:opacity-50";

const variants = {
  primary: "bg-brand text-white shadow-soft hover:bg-brand-hover active:bg-brand-active",
  secondary: "bg-accent text-ink hover:bg-accent-strong hover:text-white",
  soft: "bg-mint text-ink hover:bg-mint-soft",
  outline: "border-2 border-brand bg-surface text-ink hover:bg-mint-soft",
  ghost: "bg-transparent text-ink hover:bg-surface-muted",
  danger: "bg-danger text-white hover:opacity-90",
};
```

Reglas:

- Un solo botón primario por pantalla.
- El botón principal de una acción destructiva nunca es `accent`.
- En móvil, el botón de acción principal puede ocupar todo el ancho.
- No uses `text-white` sobre `accent`.

## Enlace

```tsx
"font-bold text-ink underline decoration-accent decoration-2 underline-offset-4 " +
"hover:decoration-brand focus-visible:outline-none focus-visible:ring-2 " +
"focus-visible:ring-brand focus-visible:ring-offset-2 rounded-xs"
```

El subrayado existe siempre, no solo en hover: es la señal accesible.

## Campo de formulario

```tsx
<div className="space-y-2">
  <label htmlFor="rut" className="block text-[15px] font-bold text-ink">
    RUT del apoderado
  </label>
  <input
    id="rut"
    className="min-h-12 w-full rounded-control border border-border-control bg-surface
               px-4 text-base text-ink placeholder:text-ink-muted
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand
               focus-visible:ring-offset-2 focus-visible:ring-offset-surface
               aria-[invalid=true]:border-danger"
  />
  <p className="text-[15px] leading-6 text-ink-muted">
    Sin puntos ni guion. Ejemplo: 123456789
  </p>
</div>
```

- Etiqueta siempre visible arriba. No uses placeholder como etiqueta.
- Texto de ayuda en `text-ink-muted`, nunca más claro.
- Error: borde `danger`, mensaje con texto y `aria-invalid`; no basta el color.
- Agrupa campos relacionados en bloques de máximo 6.
- Un formulario móvil no debe superar los 560 px de ancho.

## Tarjeta

```tsx
<section className="rounded-card border border-border-subtle bg-surface p-5 shadow-soft">
  <h2 className="text-xl font-bold text-ink">Autorizaciones pendientes</h2>
  <p className="mt-2 text-[15px] leading-6 text-ink-muted">
    Tienes 2 eventos por firmar antes del viernes.
  </p>
</section>
```

- Tarjeta destacada: `bg-mint-soft border border-mint`.
- Tarjeta de acción: toda la tarjeta es clicable con un solo enlace real, nunca un `div` con `onClick`.
- No apiles tarjetas con sombras dentro de tarjetas con sombras.

## Tarjeta de evento

```tsx
<article className="rounded-card border border-border-subtle bg-surface p-5 shadow-soft">
  <p className="text-[13px] font-bold uppercase tracking-wide text-accent-strong">
    Evento
  </p>
  <h3 className="mt-1 text-xl font-bold text-ink">Salida pedagógica a Valparaíso</h3>
  <p className="mt-2 text-[15px] leading-6 text-ink-muted">
    Jueves 12 de noviembre, 08:30 · 4° básico A
  </p>
  <dl className="mt-4 grid grid-cols-2 gap-3 text-[15px]">
    <div>
      <dt className="text-ink-muted">Firma hasta</dt>
      <dd className="font-bold text-ink">Viernes 6 de noviembre</dd>
    </div>
    <div>
      <dt className="text-ink-muted">Estado</dt>
      <dd><span className="...">Pendiente</span></dd>
    </div>
  </dl>
</article>
```

Fechas siempre en `America/Santiago` y con formato local, nunca `2026-11-06`.

## Resumen obligatorio

Es el bloque más importante del flujo. Debe leerse como documento, no como tarjeta decorativa.

```tsx
<section aria-labelledby="resumen" className="rounded-card border-2 border-mint bg-mint-soft p-5">
  <h2 id="resumen" className="text-2xl font-bold text-ink">Revisa antes de firmar</h2>
  <p className="mt-1 text-[15px] leading-6 text-ink-muted">
    Revisa los datos. La autorización queda válida al enviarse.
  </p>

  <dl className="mt-5 divide-y divide-border-subtle">
    <div className="grid gap-1 py-3 sm:grid-cols-3">
      <dt className="text-[15px] text-ink-muted">Estudiante</dt>
      <dd className="text-base font-bold text-ink sm:col-span-2">Martina Pérez Soto</dd>
    </div>
    {/* Evento, fecha, propósito y fecha límite con el mismo patrón */}
  </dl>
</section>
```

- Fondo `mint-soft` con borde `mint`, no `accent`.
- Título explícito: "Revisa antes de firmar" o "Revisa antes de enviar".
- Datos en `dl` semántico, con etiqueta y valor legibles sin zoom.
- En móvil, la barra de confirmación se pega abajo con `sticky bottom-0` y fondo `surface` con borde superior.
- El botón de confirmar es `primary`; "Cancelar" es `ghost`.

## Calendario de retiros

```tsx
<button
  aria-pressed={selected}
  disabled={!isFuture}
  className={cn(
    "flex h-12 items-center justify-center rounded-control text-base font-bold transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
    isFuture && "bg-surface text-ink border border-border-control hover:bg-mint-soft",
    !isFuture && "bg-surface-muted text-ink-muted opacity-60 cursor-not-allowed",
    selected && "bg-brand text-white border-brand",
    isToday && !selected && "border-2 border-accent",
  )}
>
  {day}
</button>
```

- Solo se habilitan fechas futuras, según la regla 11 de `docs/00-producto.md`. La decisión de qué fecha es válida vive en el servicio, no en el componente.
- Seleccionado: `brand` con texto blanco. El día de hoy se marca con borde `accent` solo si el servicio lo habilita.
- No se muestran fechas bloqueadas a mano: ese bloqueo no existe en el producto.
- Cada día es un botón real con `aria-pressed` y etiqueta accesible completa.
- El calendario cabe a 320 px sin scroll horizontal.

## Carga de documentos

```tsx
<label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3
                  rounded-card border-2 border-dashed border-border-control bg-mint-soft p-6
                  text-center focus-within:ring-2 focus-within:ring-brand
                  focus-within:ring-offset-2 focus-within:ring-offset-surface">
  <span className="text-base font-bold text-ink">Subir o tomar foto del documento</span>
  <span className="text-[15px] text-ink-muted">JPG o PNG, máximo 10 MB</span>
  <input type="file" accept="image/*" capture="environment" className="sr-only" />
</label>
```

- Nunca muestres la URL del documento ni una miniatura de la cédula en pantalla compartida.
- El estado de éxito dice el nombre del archivo, no muestra el documento.
- El botón de cámara es explícito en móvil.

## Alertas y estados

```tsx
const alert = {
  info: "border-info/40 bg-info-soft text-info",
  success: "border-success/40 bg-success-soft text-success",
  warning: "border-warning/40 bg-warning-soft text-warning",
  danger: "border-danger/40 bg-danger-soft text-danger",
};
```

- Siempre con ícono + título + texto. El color es refuerzo, no información.
- `role="alert"` solo para errores urgentes; un error de formulario va junto al campo.

## Estado vacío

```tsx
<div className="rounded-card border border-border-subtle bg-surface p-8 text-center">
  <h3 className="text-xl font-bold text-ink">No hay eventos por firmar</h3>
  <p className="mx-auto mt-2 max-w-prose text-[15px] leading-6 text-ink-muted">
    Cuando el colegio publique un evento que aplique a tus estudiantes, aparecerá aquí.
  </p>
</div>
```

Sin ilustraciones tristes ni emoji. Un ícono de trazo en `mint` es suficiente.

## Carga

`Skeleton` con `bg-surface-muted`, `rounded-block`, sin brillos. Respeta `prefers-reduced-motion`. Nunca dejes un botón enviando sin indicador de progreso.

## Navegación

- Encabezado: blanco, borde inferior `border-border-subtle`, título en `brand`, sin sombra.
- Panel de administración: barra lateral `bg-brand` con texto blanco y estado activo `bg-white/10` + borde izquierdo `accent`.
- Móvil: navegación inferior con 3 a 5 ítems, alto 64 px, etiqueta bajo el ícono, activo en `brand` y el resto `text-ink-muted`.
- Nunca uses solo íconos sin etiqueta en la navegación principal.

## Tablas (administración)

- Encabezado `bg-surface-muted`, texto `text-ink-muted` de 13 px en mayúsculas, filas separadas por `border-border-subtle`.
- En móvil, cada fila se convierte en tarjeta con etiqueta y valor; nunca scroll horizontal silencioso.
- Cifras a la derecha y con `tabular-nums`. Estados como chip suave.

## Chip de estado

```tsx
const chip = {
  pendiente: "bg-mint-soft text-ink",
  aprobada: "bg-success-soft text-success",
  rechazada: "bg-danger-soft text-danger",
  anulada: "bg-surface-muted text-ink-muted line-through",
};
```

`rounded-full px-3 py-1 text-[13px] font-bold`. El estado siempre va escrito; el color acompaña.

## Pantalla de inicio del apoderado

Dos acciones grandes, una primaria y una secundaria, separadas por 16 px:

```tsx
<a className="flex min-h-28 flex-col justify-center rounded-card bg-brand p-6 text-white shadow-soft">
  <span className="text-2xl font-bold">Firmar autorización</span>
  <span className="mt-1 text-[15px] text-white/80">Eventos que aplican a tus estudiantes</span>
</a>

<a className="flex min-h-28 flex-col justify-center rounded-card bg-accent p-6 text-ink shadow-soft">
  <span className="text-2xl font-bold">Retiro externo</span>
  <span className="mt-1 text-[15px] text-ink/80">Autoriza a una persona para retirar</span>
</a>
```

Sin menús escondidos: el apoderado llega en dos toques a la acción.

---

## Verificación final por pantalla

1. Mira la pantalla a 320 px y a 1440 px.
2. Recorre con teclado: todo control es alcanzable y el foco se ve.
3. Simula daltonismo: los estados siguen siendo comprensibles.
4. Revisa que no quede ningún hex fuera de `tokens.md`.
5. Confirma que no se agregó un color, una fuente ni una sombra nuevas.
