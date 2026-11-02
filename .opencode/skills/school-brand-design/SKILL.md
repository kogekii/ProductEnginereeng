---
name: Diseño de marca del colegio
description: "Preserva la identidad visual del colegio al crear o modificar cualquier interfaz visible. Fija la paleta institucional (1f2041, 42bfdd y bbe6e4), la tipografía Charis SIL, los bordes redondeados y las superficies suaves. Úsala antes de escribir estilos, componentes, tokens de tema, correos o pantallas."
metadata:
  author: Product Engineering
  version: "1.0"
---

# Diseño de marca del colegio

Esta skill protege la apariencia del colegio. Se aplica a toda superficie que vea un apoderado, un profesor o un administrador: pantallas, formularios, modales, correos, PDF y estados vacíos.

**Lee siempre los dos archivos de referencia antes de escribir estilos:**

- `references/tokens.md`: colores, tipografía, radios, sombras y su equivalencia en Tailwind y shadcn/ui.
- `references/components.md`: recetas de botones, campos, tarjetas, resúmenes, calendario y estados.

Si el proyecto todavía no tiene scaffold, no inventes archivos: deja la receta documentada en el change y aplícala cuando se cree `src/client`.

## 1. Principios no negociables

1. **Una sola marca.** El color distintivo del colegio es `#1f2041`. Todo lo demás lo acompaña, nunca compite.
2. **Suave, no plano.** Superficies claras, bordes redondeados y sombras muy tenues. Sin esquinas rectas ni sombras negras duras.
3. **Paleta cerrada.** No se agregan colores de marca sin aprobación y sin actualizar `docs/00-producto.md`.
4. **Contraste real.** La paleta tiene contrastes muy distintos: el celeste y el menta son decorativos. El texto legible va en `#1f2041` sobre fondos claros.
5. **Mobile-first de verdad.** Se diseña primero para el navegador interno de WhatsApp, con áreas táctiles de al menos 48 px.
6. **Legibilidad sobre estética.** Charis SIL es una serif: necesita tamaño generoso, interlineado amplio y nada de mayúsculas sostenidas largas.
7. **Sin sorpresas.** Los estados (error, éxito, advertencia) se ven igual en toda la aplicación y siempre incluyen texto, no solo color.

## 2. Paleta y uso permitido

| Token | Hex | Rol | Permitido | Prohibido |
|---|---|---|---|---|
| `brand` | `#1f2041` | Color distintivo | Texto principal, botón primario, encabezados, íconos activos | Fondo de página completo |
| `accent` | `#42bfdd` | Acento vivo | Rellenos de botón secundario, bordes de énfasis, ilustraciones, indicadores | Texto blanco encima, texto pequeño sobre blanco |
| `mint` | `#bbe6e4` | Acento suave | Fondos de tarjetas destacadas, cabeceras, chips, estados informativos | Texto blanco encima, texto de bajo contraste |
| `surface` | `#ffffff` | Fondo base | Formularios, tarjetas, modales | — |
| `surface-muted` | `#f2f7f8` | Fondo alterno | Secciones, filas alternas, skeletons | — |
| `ink-muted` | `#4d4e6b` | Texto secundario | Ayudas, metadatos, fechas | Texto principal |
| `border-subtle` | `#d3e0e3` | Separadores | Líneas decorativas entre bloques | Bordes de campos de formulario |
| `border-control` | `#7d8f96` | Bordes de control | Inputs, selects, checkboxes, radios | Decoración |

Reglas de contraste que no se negocian:

- Sobre `brand` el texto va en blanco o `mint`. Nunca `accent`.
- Sobre `mint` el texto va en `brand`. Nunca blanco.
- Sobre `accent` el texto va en `brand` (contraste aproximado 7,2:1). Nunca blanco (2,2:1).
- `ink-muted` no se usa sobre `accent` (contraste aproximado 3,7:1). Sobre `mint` se prefiere `ink`.
- Bordes de campos usan `border-control`, no `border-subtle`: un borde decorativo no alcanza el 3:1 que exige un control.
- El anillo de foco usa `brand` sobre fondos claros y blanco o `mint` sobre fondos `brand`. `accent` no sirve como único indicador de foco.
- Los colores de estado son la única excepción a la paleta y se usan solo para estados, nunca como decoración.

## 3. Tipografía

- Familia: **Charis SIL**, cargada con `@fontsource/charis-sil` (paquete oficial, licencia SIL OFL 1.1). Se autoaloja para no depender de Google Fonts.
- Pesos disponibles: **400 y 700**. No uses 500 ni 600: la familia no los trae y el navegador los sintetiza.
- Reserva `latin` (incluye tildes y `ñ`). No cargues cirílico ni vietnamita.
- Fallback: `Georgia, "Times New Roman", serif`.
- Tamaño mínimo de texto: 16 px. El cuerpo va en 17 px con interlineado 1,65 porque la serif necesita más aire.
- Títulos en 700, sin `letter-spacing` negativo. No uses mayúsculas en frases largas ni en párrafos.
- Cifras de fechas y montos con `font-variant-numeric: tabular-nums`.

Escala aprobada: 40/44 (display escritorio), 32/38 (display móvil), 28/34, 24/30, 20/28, 17/28 (cuerpo), 15/24 (ayuda), 13/20 (etiqueta).

## 4. Forma, profundidad y espacio

- Radios: 12 px para campos, 16 px para bloques compactos, 24 px para tarjetas y modales, 999 px para botones y chips.
- Sombras: dos niveles como máximo, con `rgb(31 32 65 / 0.06)` hasta `rgb(31 32 65 / 0.10)`. Nunca `#000` ni opacidades altas.
- Espaciado en múltiplos de 4. Márgenes de página: 16 a 20 px en móvil, 24 a 32 px en escritorio.
- Ancho de lectura máximo: 68 caracteres en formularios y resúmenes.
- Iconografía de trazo, 1,75 a 2 px, color `brand`. No uses emoji como íconos.
- Gradientes permitidos: `mint` a blanco, muy sutiles, solo en cabeceras o pantallas de bienvenida.

## 5. Movimiento

- Transiciones de 150 a 200 ms en color, borde y sombra. Nada de rebotes.
- Respeta `prefers-reduced-motion`: sin desplazamientos ni escalas.
- Prohibido animar el layout o hacer parpadeos.

## 6. Flujo de trabajo

1. Lee `docs/00-producto.md` y el change activo.
2. Lee `references/tokens.md` y `references/components.md`.
3. Identifica si la pantalla es de apoderado o de administrador y si muestra datos sensibles.
4. Escribe la interfaz usando tokens semánticos, nunca hex sueltos en componentes.
5. Verifica contraste, foco, tamaños táctiles y estados vacíos, de error y de carga.
6. Revisa la checklist de la sección 8 antes de dar por terminado.
7. Si cambiaste una decisión visual de producto, actualiza `docs/00-producto.md` y `openspec/config.yaml`.

## 7. Implementación

- Fuente única de verdad: variables CSS declaradas en el entry de estilos del cliente (`src/client/index.css` cuando exista el scaffold), expuestas a Tailwind con `@theme`.
- En componentes React se usan clases semánticas (`bg-brand`, `text-ink`, `text-ink-muted`, `rounded-card`), no valores arbitrarios tipo `bg-[#42bfdd]`.
- shadcn/ui se configura mapeando sus variables a los tokens del colegio. No se aceptan los grises neutros por defecto.
- Las variantes se centralizan en un helper de clases (`cn`) y en las variantes del componente. No se repite el mismo bloque de clases en diez lugares.
- Nada de estilos inline con hex, salvo un color calculado en tiempo de ejecución y debidamente justificado.
- Modo oscuro: fuera de alcance hasta que `docs/00-producto.md` lo autorice. No lo inventes.
- El logo oficial no está en el repositorio. No dibujes ni inventes un escudo: pídelo al colegio. Mientras no exista, usa un wordmark tipográfico simple, sin recolorear ni deformar nada.

## 8. Checklist antes de entregar

- [ ] Solo aparecen los colores de la paleta y los de estado.
- [ ] Todo texto legible está en `brand` o `ink-muted` sobre fondo claro.
- [ ] Ningún texto blanco cae sobre `accent` o `mint`.
- [ ] Bordes de campos usan `border-control` y se ven sin depender del foco.
- [ ] El foco de teclado es visible y contrasta con el fondo.
- [ ] Botones y enlaces tienen al menos 48 px de alto en móvil.
- [ ] La tipografía es Charis SIL con fallback y solo pesos 400 y 700.
- [ ] El cuerpo no baja de 16 px y el interlineado es cómodo.
- [ ] Radios suaves y coherentes con la escala; ninguna esquina recta decorativa.
- [ ] Sombras tenues, sin negro puro.
- [ ] Toda acción tiene estados de carga, vacío y error con texto.
- [ ] Los formularios se leen a 320 px de ancho.
- [ ] No hay emoji como ícono ni colores nuevos sin aprobación.
- [ ] El texto visible está en español de Chile, con tildes.

## 9. Antipatrones

- Gradientes morados o "modernos" ajenos a la marca.
- Glassmorphism, neón, degradados saturados o modo oscuro inventado.
- Texto `#000` o grises genéricos de shadcn sin mapear.
- Botones rectangulares, sombras duras y bordes de 1 px negros.
- Tarjetas con cuatro colores distintos para "diferenciar".
- Texto centrado en párrafos largos.
- Formularios de una sola columna estirados a 1400 px.
- Indicar errores solo con color.
- Reemplazar el logo por un ícono genérico o cambiarle el color.

## 10. Referencias

- `references/tokens.md`: valores exactos, `@theme` de Tailwind, mapeo a shadcn/ui y script de contraste.
- `references/components.md`: recetas listas para botones, campos, tarjetas, resúmenes obligatorios, calendario, alertas y dashboard.
- `scripts/contrast.mjs`: calcula el contraste WCAG de un par de colores.
