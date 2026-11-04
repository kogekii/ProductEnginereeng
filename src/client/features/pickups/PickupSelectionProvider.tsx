import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthProvider.js';
import {
  addPickupDay, createPickupSelection, getPickupDays, removePickupDay, resetPickupDayToCommon,
  setCommonStudentIds, setPickupDayStudentIds, validatePickupSelection, type PickupSelection,
} from '../../../shared/pickup-selection.js';

export interface ExternalPersonForm {
  firstName: string;
  lastName: string;
  documentType: 'RUT' | 'PASSPORT';
  documentNumber: string;
  relationship: string;
}

interface PickupSelectionContextValue {
  selection: PickupSelection | null;
  externalPerson: ExternalPersonForm;
  guardianDocumentId: string | null;
  externalDocumentId: string | null;
  idempotencyKey: string | null;
  initialize(studentIds: string[]): void;
  addDay(date: string, activeStudentIds: string[]): void;
  removeDay(date: string): void;
  setCommon(studentIds: string[]): void;
  setDayStudents(date: string, studentIds: string[]): void;
  resetDay(date: string): void;
  updateExternalPerson(person: Partial<ExternalPersonForm>): void;
  setGuardianDocument(documentId: string | null): void;
  setExternalDocument(documentId: string | null): void;
  submissionKey(): string;
  clear(): void;
}

const initialExternalPerson: ExternalPersonForm = { firstName: '', lastName: '', documentType: 'RUT', documentNumber: '', relationship: '' };
const PickupSelectionContext = createContext<PickupSelectionContextValue | null>(null);

export function PickupSelectionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selection, setSelection] = useState<PickupSelection | null>(null);
  const [externalPerson, setExternalPerson] = useState(initialExternalPerson);
  const [guardianDocumentId, setGuardianDocumentIdState] = useState<string | null>(null);
  const [externalDocumentId, setExternalDocumentIdState] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

  const clear = useCallback(() => {
    setSelection(null);
    setExternalPerson(initialExternalPerson);
    setGuardianDocumentIdState(null);
    setExternalDocumentIdState(null);
    setIdempotencyKey(null);
  }, []);

  useEffect(() => { if (!user) clear(); }, [user, clear]);

  const initialize = useCallback((studentIds: string[]) => {
    setSelection((previous) => previous ?? createPickupSelection(studentIds));
  }, []);
  const addDay = useCallback((date: string, studentIds: string[]) => {
    setSelection((previous) => addPickupDay(previous ?? createPickupSelection(studentIds), date, studentIds));
    setIdempotencyKey(null);
  }, []);
  const removeDay = useCallback((date: string) => { setSelection((previous) => previous ? removePickupDay(previous, date) : previous); setIdempotencyKey(null); }, []);
  const setCommon = useCallback((studentIds: string[]) => { setSelection((previous) => previous ? setCommonStudentIds(previous, studentIds) : createPickupSelection(studentIds)); setIdempotencyKey(null); }, []);
  const setDayStudents = useCallback((date: string, studentIds: string[]) => { setSelection((previous) => previous ? setPickupDayStudentIds(previous, date, studentIds) : previous); setIdempotencyKey(null); }, []);
  const resetDay = useCallback((date: string) => { setSelection((previous) => previous ? resetPickupDayToCommon(previous, date) : previous); setIdempotencyKey(null); }, []);
  const updateExternalPerson = useCallback((person: Partial<ExternalPersonForm>) => { setExternalPerson((previous) => ({ ...previous, ...person })); setIdempotencyKey(null); }, []);
  const setGuardianDocument = useCallback((documentId: string | null) => { setGuardianDocumentIdState(documentId); setExternalDocumentIdState(null); setIdempotencyKey(null); }, []);
  const setExternalDocument = useCallback((documentId: string | null) => { setExternalDocumentIdState(documentId); setIdempotencyKey(null); }, []);
  const submissionKey = useCallback(() => {
    const key = idempotencyKey ?? crypto.randomUUID();
    setIdempotencyKey(key);
    return key;
  }, [idempotencyKey]);

  const value = useMemo(() => ({
    selection, externalPerson, guardianDocumentId, externalDocumentId, idempotencyKey,
    initialize, addDay, removeDay, setCommon, setDayStudents, resetDay,
    updateExternalPerson, setGuardianDocument, setExternalDocument, submissionKey, clear,
  }), [selection, externalPerson, guardianDocumentId, externalDocumentId, idempotencyKey, initialize, addDay, removeDay, setCommon, setDayStudents, resetDay, updateExternalPerson, setGuardianDocument, setExternalDocument, submissionKey, clear]);

  return <PickupSelectionContext.Provider value={value}>{children}</PickupSelectionContext.Provider>;
}

export function usePickupSelection() {
  const value = useContext(PickupSelectionContext);
  if (!value) throw new Error('La solicitud de retiro requiere su proveedor de selección.');
  return value;
}

export { getPickupDays, validatePickupSelection };
