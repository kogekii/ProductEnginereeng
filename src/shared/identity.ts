export function normalizeRut(value: string): string {
  return value.trim().replace(/[.\s-]/g, '').toUpperCase();
}

export function isValidRut(value: string): boolean {
  const normalized = normalizeRut(value);
  if (!/^\d{1,8}[0-9K]$/.test(normalized)) return false;

  const body = normalized.slice(0, -1);
  let multiplier = 2;
  let sum = 0;
  for (let index = body.length - 1; index >= 0; index--) {
    sum += Number(body[index]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  const verifier = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  return normalized.at(-1) === verifier;
}
