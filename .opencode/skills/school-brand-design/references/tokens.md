# Tokens de diseño del colegio

Valores exactos de la identidad visual. Si un valor no está aquí, no existe todavía: pregunta antes de inventarlo.

## 1. Color

### Marca

| Token | Hex | Uso |
|---|---|---|
| `brand` | `#1f2041` | Color distintivo, texto principal, botón primario |
| `brand-hover` | `#2e2f57` | Hover del botón primario |
| `brand-active` | `#14152b` | Estado presionado |
| `accent` | `#42bfdd` | Acento vivo, botón secundario, énfasis |
| `accent-strong` | `#1f7f96` | Texto o ícono de acento sobre fondo claro |
| `mint` | `#bbe6e4` | Fondo suave destacado |
| `mint-soft` | `#e7f6f5` | Fondo informativo muy tenue |

### Superficie y texto

| Token | Hex | Uso |
|---|---|---|
| `surface` | `#ffffff` | Fondo base |
| `surface-muted` | `#f2f7f8` | Sección alterna, filas, skeletons |
| `border-subtle` | `#d3e0e3` | Separadores decorativos |
| `border-control` | `#7d8f96` | Bordes de inputs y controles (3:1) |
| `ink` | `#1f2041` | Rol de texto principal (mismo hex que `brand`) |
| `ink-muted` | `#4d4e6b` | Texto secundario (8:1 sobre blanco) |
| `ink-inverse` | `#ffffff` | Texto sobre `brand` |
| `on-accent` | `#1f2041` | Texto sobre `accent` |

`ink` e `ink-muted` existen para nombrar el rol de lectura. No son colores nuevos: `ink` comparte el hex de `brand` y `ink-muted` es su derivado oscuro. No agregues otro gris para texto.

### Estados

| Token | Texto | Fondo | Borde |
|---|---|---|---|
| `success` | `#1e6b4f` | `#e6f4ee` | `#9fd3bd` |
| `warning` | `#8a5300` | `#fdf0d9` | `#e7c37f` |
| `danger` | `#a3231b` | `#fbe9e7` | `#e9aaa5` |
| `info` | `#1f2041` | `#dff5fa` | `#8fd9ea` |

Los colores de estado no se usan como decoración ni para "alegrar" una tarjeta.

### Contraste comprobado

| Combinación | Aprox. | Veredicto |
|---|---|---|
| `brand` sobre blanco | 15,6:1 | Texto normal |
| `brand` sobre `mint` | 11,6:1 | Texto normal |
| `brand` sobre `accent` | 7,2:1 | Texto normal |
| `ink-muted` sobre blanco | 8,0:1 | Texto normal |
| `border-control` sobre blanco | 3,4:1 | Borde de control |
| blanco sobre `accent` | 2,2:1 | Prohibido |
| blanco sobre `mint` | 1,4:1 | Prohibido |
| `accent` sobre blanco | 2,2:1 | Solo gráfico grande |

Verifica cualquier par nuevo con `node scripts/contrast.mjs "#1f2041" "#bbe6e4"` desde la carpeta de la skill.

## 2. Tipografía

| Token | Valor |
|---|---|
| `font-sans` | `"Charis SIL", Georgia, "Times New Roman", serif` |
| Pesos | 400 y 700 |
| Cuerpo | 17 px / 28 px |
| Ayuda | 15 px / 24 px |
| Etiqueta | 13 px / 20 px |
| Título 3 | 20 px / 28 px, 700 |
| Título 2 | 24 px / 30 px, 700 |
| Título 1 | 28 px / 34 px, 700 |
| Display móvil | 32 px / 38 px, 700 |
| Display escritorio | 40 px / 44 px, 700 |

Instalación prevista cuando exista el cliente:

```bash
pnpm add @fontsource/charis-sil
```

```ts
// src/client/main.tsx
import "@fontsource/charis-sil/latin-400.css";
import "@fontsource/charis-sil/latin-700.css";
```

No importes el `index.css` del paquete completo: carga subsets que el colegio no necesita.

## 3. Forma

| Token | Valor | Uso |
|---|---|---|
| `radius-xs` | 6 px | Etiquetas pequeñas |
| `radius-sm` | 10 px | Chips, badges |
| `radius-control` | 12 px | Inputs, selects, textareas |
| `radius-block` | 16 px | Bloques internos, imágenes |
| `radius-card` | 24 px | Tarjetas, modales, hojas |
| `radius-full` | 999 px | Botones, avatares, píldoras |

| Token | Valor |
|---|---|
| `shadow-soft` | `0 1px 2px rgb(31 32 65 / 0.06), 0 4px 12px rgb(31 32 65 / 0.06)` |
| `shadow-lifted` | `0 8px 24px rgb(31 32 65 / 0.10)` |
| `shadow-focus` | `0 0 0 3px rgb(31 32 65 / 0.35)` |

Nunca uses `rgba(0, 0, 0, …)` para sombras.

## 4. Espacio

Base 4 px. Escala: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.

- Padding de página móvil: 16 a 20 px.
- Padding de página escritorio: 24 a 32 px.
- Separación entre secciones: 32 a 48 px.
- Alto mínimo de control táctil: 48 px.
- Ancho máximo de formulario: 560 px.
- Ancho máximo de texto corrido: 68ch.

## 5. Tailwind v4

```css
/* src/client/index.css */
@import "tailwindcss";

@theme {
  --font-sans: "Charis SIL", Georgia, "Times New Roman", serif;

  --color-brand: #1f2041;
  --color-brand-hover: #2e2f57;
  --color-brand-active: #14152b;
  --color-accent: #42bfdd;
  --color-accent-strong: #1f7f96;
  --color-mint: #bbe6e4;
  --color-mint-soft: #e7f6f5;

  --color-surface: #ffffff;
  --color-surface-muted: #f2f7f8;
  --color-border-subtle: #d3e0e3;
  --color-border-control: #7d8f96;
  --color-ink: #1f2041;
  --color-ink-muted: #4d4e6b;
  --color-ink-inverse: #ffffff;
  --color-on-accent: #1f2041;

  --color-success: #1e6b4f;
  --color-success-soft: #e6f4ee;
  --color-warning: #8a5300;
  --color-warning-soft: #fdf0d9;
  --color-danger: #a3231b;
  --color-danger-soft: #fbe9e7;
  --color-info: #1f2041;
  --color-info-soft: #dff5fa;

  --radius-xs: 6px;
  --radius-sm: 10px;
  --radius-control: 12px;
  --radius-block: 16px;
  --radius-card: 24px;
  --radius-full: 999px;

  --shadow-soft: 0 1px 2px rgb(31 32 65 / 0.06), 0 4px 12px rgb(31 32 65 / 0.06);
  --shadow-lifted: 0 8px 24px rgb(31 32 65 / 0.10);
  --shadow-focus: 0 0 0 3px rgb(31 32 65 / 0.35);
}

@layer base {
  html {
    font-family: var(--font-sans);
    color: var(--color-ink);
    background-color: var(--color-surface-muted);
    -webkit-text-size-adjust: 100%;
  }

  body {
    font-size: 17px;
    line-height: 1.65;
  }

  :focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus);
    border-radius: var(--radius-control);
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
}
```

Si el scaffold usa Tailwind 3, estos mismos valores van en `theme.extend` de `tailwind.config.ts`. No cambies la nomenclatura semántica.

## 6. shadcn/ui

Mapea las variables de shadcn a los tokens del colegio. La equivalencia semántica manda, no el nombre exacto:

```css
:root {
  --background: var(--color-surface);
  --foreground: var(--color-ink);
  --card: var(--color-surface);
  --card-foreground: var(--color-ink);
  --popover: var(--color-surface);
  --popover-foreground: var(--color-ink);
  --primary: var(--color-brand);
  --primary-foreground: #ffffff;
  --secondary: var(--color-mint);
  --secondary-foreground: var(--color-brand);
  --muted: var(--color-surface-muted);
  --muted-foreground: var(--color-ink-muted);
  --accent: var(--color-accent);
  --accent-foreground: var(--color-brand);
  --destructive: var(--color-danger);
  --destructive-foreground: #ffffff;
  --border: var(--color-border-subtle);
  --input: var(--color-border-control);
  --ring: var(--color-brand);
  --radius: 1rem;
}
```

Reglas:

- No dejes los grises por defecto de shadcn visibles en pantalla.
- El `ring` por defecto debe ser `brand`, no `accent`.
- Los `Dialog`, `Sheet` y `Popover` usan `rounded-card` y `shadow-lifted`.
- `Sonner`/toasts usan los colores de estado, con texto e ícono.

## 7. Correos y documentos

- Correo: fondo `#f2f7f8`, tarjeta blanca, encabezado `brand` con texto blanco, botón `brand`, radio 16 px, ancho máximo 600 px.
- No uses sombras en correo: muchos clientes no las soportan.
- PDF: encabezado `brand`, texto `#1f2041`, tablas con separadores `#d3e0e3`.
- La tipografía de respaldo en correo es `Georgia, serif`; Charis SIL no está disponible en todos los clientes.

## 8. Dónde viven los tokens

| Momento | Ubicación |
|---|---|
| Sin scaffold | Esta skill y el `design.md` del change |
| Con scaffold | `src/client/index.css` con `@theme` |
| Componentes compartidos | `src/client/components/ui/*` |
| Pruebas visuales | `tests/` (Playwright) o Storybook solo si el change lo autoriza |

Prohibido: duplicar hex en componentes, crear un segundo archivo de tema o introducir una librería de UI con su propia paleta.
