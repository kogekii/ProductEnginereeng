import { describe, expect, it } from 'vitest';
import { pickupSubmissionSchema, pickupDayInputSchema } from '../../src/shared/pickup.js';
import { addPickupDay, createPickupSelection, getPickupDays, removePickupDay, resetPickupDayToCommon, setCommonStudentIds, setPickupDayStudentIds, validatePickupSelection } from '../../src/shared/pickup-selection.js';

const guardianDocumentId = '60000000-0000-4000-8000-000000000001';
const externalDocumentId = '60000000-0000-4000-8000-000000000002';
const studentA = '30000000-0000-4000-8000-000000000001';
const studentB = '30000000-0000-4000-8000-000000000002';

describe('schemas de retiro externo', () => {
  it('valida un único externo, dos documentos distintos y días no repetidos', () => {
    const parsed = pickupSubmissionSchema.safeParse({
      idempotencyKey: '90000000-0000-4000-8000-000000000001', guardianDocumentId,
      externalPerson: { firstName: '  Alex ', lastName: ' Pérez ', documentType: 'RUT', documentNumber: '12.345.678-5', relationship: 'Tío', documentId: externalDocumentId },
      days: [{ date: '2026-11-05', studentIds: [studentA, studentB] }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.externalPerson.firstName).toBe('Alex');
  });

  it('rechaza RUT inválido, documentos repetidos, fechas imposibles y día sin estudiantes', () => {
    expect(pickupSubmissionSchema.safeParse({
      idempotencyKey: '90000000-0000-4000-8000-000000000001', guardianDocumentId,
      externalPerson: { firstName: 'Alex', lastName: 'Pérez', documentType: 'RUT', documentNumber: '12.345.678-4', relationship: 'Tío', documentId: guardianDocumentId },
      days: [{ date: '2026-02-30', studentIds: [] }],
    }).success).toBe(false);
    expect(pickupDayInputSchema.safeParse({ date: '2026-11-05', studentIds: [studentA, studentA] }).success).toBe(false);
  });

  it('acepta pasaporte no vacío', () => {
    const parsed = pickupSubmissionSchema.safeParse({
      idempotencyKey: '90000000-0000-4000-8000-000000000001', guardianDocumentId,
      externalPerson: { firstName: 'Alex', lastName: 'Pérez', documentType: 'PASSPORT', documentNumber: 'AB12345', relationship: 'Tío', documentId: externalDocumentId },
      days: [{ date: '2026-11-05', studentIds: [studentA] }],
    });
    expect(parsed.success).toBe(true);
  });
});

describe('selección de estudiantes por día', () => {
  it('agrega todos los estudiantes activos por defecto y conserva una fecha personalizada', () => {
    let selection = createPickupSelection([studentA, studentB]);
    selection = addPickupDay(selection, '2026-11-05', [studentA, studentB]);
    selection = addPickupDay(selection, '2026-11-06', [studentA, studentB]);
    selection = setPickupDayStudentIds(selection, '2026-11-06', [studentA]);
    selection = setCommonStudentIds(selection, [studentB]);
    expect(selection.days['2026-11-05']?.studentIds).toEqual([studentB]);
    expect(selection.days['2026-11-06']?.studentIds).toEqual([studentA]);
    expect(selection.days['2026-11-06']?.customized).toBe(true);
  });

  it('una fecha nueva o reagregada parte con todos y permite restaurar la selección común', () => {
    let selection = createPickupSelection([studentA, studentB]);
    selection = addPickupDay(selection, '2026-11-05', [studentA, studentB]);
    selection = setPickupDayStudentIds(selection, '2026-11-05', [studentA]);
    selection = setCommonStudentIds(selection, [studentB]);
    selection = resetPickupDayToCommon(selection, '2026-11-05');
    selection = removePickupDay(selection, '2026-11-05');
    selection = addPickupDay(selection, '2026-11-05', [studentA, studentB]);
    expect(selection.days['2026-11-05']?.studentIds).toEqual([studentA, studentB]);
    expect(getPickupDays(selection)).toEqual([{ date: '2026-11-05', studentIds: [studentA, studentB] }]);
  });

  it('no permite continuar sin días o con días vacíos', () => {
    let selection = createPickupSelection([studentA]);
    expect(validatePickupSelection(selection).valid).toBe(false);
    selection = addPickupDay(selection, '2026-11-05', [studentA]);
    selection = setPickupDayStudentIds(selection, '2026-11-05', []);
    expect(validatePickupSelection(selection)).toEqual({ valid: false, emptyDates: ['2026-11-05'] });
    selection = removePickupDay(selection, '2026-11-05');
    expect(getPickupDays(selection)).toEqual([]);
  });
});
