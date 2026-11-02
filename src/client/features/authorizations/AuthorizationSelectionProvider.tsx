import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';

export interface AuthorizationPair { eventId: string; studentId: string }
type Action = { type: 'toggle'; pair: AuthorizationPair } | { type: 'set-many'; pairs: AuthorizationPair[] } | { type: 'add-many'; pairs: AuthorizationPair[] } | { type: 'clear' };
type State = Record<string, AuthorizationPair>;
const storageKey = 'authorization-selection-v1';
const keyOf = ({ eventId, studentId }: AuthorizationPair) => `${eventId}:${studentId}`;

function loadInitialState(): State {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as State;
  } catch { /* La selección dañada se descarta para mantener la pantalla utilizable. */ }
  return {};
}

function reducer(state: State, action: Action): State {
  if (action.type === 'clear') return {};
  if (action.type === 'set-many') return Object.fromEntries(action.pairs.map((pair) => [keyOf(pair), pair]));
  if (action.type === 'add-many') return { ...state, ...Object.fromEntries(action.pairs.map((pair) => [keyOf(pair), pair])) };
  const key = keyOf(action.pair);
  if (state[key]) {
    const next = { ...state };
    delete next[key];
    return next;
  }
  return { ...state, [key]: action.pair };
}

interface SelectionContextValue {
  pairs: AuthorizationPair[];
  count: number;
  has(pair: AuthorizationPair): boolean;
  toggle(pair: AuthorizationPair): void;
  selectMany(pairs: AuthorizationPair[]): void;
  addMany(pairs: AuthorizationPair[]): void;
  clear(): void;
}
const SelectionContext = createContext<SelectionContextValue | null>(null);

export function AuthorizationSelectionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);
  const pairs = Object.values(state);
  const value = useMemo<SelectionContextValue>(() => ({
    pairs,
    count: pairs.length,
    has: (pair) => Boolean(state[keyOf(pair)]),
    toggle: (pair) => dispatch({ type: 'toggle', pair }),
    selectMany: (selected) => dispatch({ type: 'set-many', pairs: selected }),
    addMany: (selected) => dispatch({ type: 'add-many', pairs: selected }),
    clear: () => dispatch({ type: 'clear' }),
  }), [pairs, state]);
  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* El estado sigue vigente en memoria. */ }
  }, [state]);
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useAuthorizationSelection() {
  const value = useContext(SelectionContext);
  if (!value) throw new Error('La selección de autorizaciones requiere su proveedor.');
  return value;
}
