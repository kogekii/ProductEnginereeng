import { describe, expect, it } from 'vitest';
import { isValidRut, normalizeRut } from '../../src/shared/identity.js';

describe('RUT chileno', () => {
  it('normaliza puntos y guion y valida el dígito verificador', () => {
    expect(normalizeRut('12.345.678-5')).toBe('123456785');
    expect(isValidRut('12.345.678-5')).toBe(true);
    expect(isValidRut('12.345.678-4')).toBe(false);
  });

  it('acepta K mayúscula o minúscula como verificador', () => {
    expect(isValidRut('1.000.005-K')).toBe(true);
    expect(isValidRut('1.000.005-k')).toBe(true);
  });
});
