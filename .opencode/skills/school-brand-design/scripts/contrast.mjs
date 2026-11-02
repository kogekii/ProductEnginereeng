#!/usr/bin/env node
// Calcula el contraste WCAG 2.2 entre dos colores.
// Uso: node scripts/contrast.mjs "#1f2041" "#bbe6e4"

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

function parseHex(value) {
  const raw = String(value ?? "").trim();
  if (!HEX_PATTERN.test(raw)) {
    throw new Error(`Color inválido: "${value}". Usa #rrggbb o #rgb.`);
  }

  const hex = raw.replace("#", "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => char + char)
          .join("")
      : hex;

  return [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16) / 255);
}

function toLinear(channel) {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function luminance([red, green, blue]) {
  return (
    0.2126 * toLinear(red) + 0.7152 * toLinear(green) + 0.0722 * toLinear(blue)
  );
}

function contrast(foreground, background) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function verdict(ratio) {
  if (ratio >= 7) return "AAA texto normal";
  if (ratio >= 4.5) return "AA texto normal";
  if (ratio >= 3) return "AA solo texto grande y controles";
  return "Insuficiente para texto";
}

function main() {
  const [foregroundArg, backgroundArg] = process.argv.slice(2);

  if (!foregroundArg || !backgroundArg) {
    console.error('Uso: node scripts/contrast.mjs "#1f2041" "#bbe6e4"');
    process.exit(1);
  }

  try {
    const ratio = contrast(parseHex(foregroundArg), parseHex(backgroundArg));
    const rounded = ratio.toFixed(2);
    console.log(`Texto:      ${foregroundArg}`);
    console.log(`Fondo:      ${backgroundArg}`);
    console.log(`Contraste:  ${rounded}:1`);
    console.log(`Veredicto:  ${verdict(ratio)}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
