import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface SessionUser {
  id: string;
  email: string | null;
  phoneE164: string | null;
  firstName: string;
  paternalSurname: string;
  maternalSurname: string | null;
  isAdmin: boolean;
}

interface AuthContextValue {
  user: SessionUser | null;
  demoMode: boolean;
  loading: boolean;
  login(identifier: string): Promise<void>;
  logout(): Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch('/api/auth/config').then(async (response) => response.ok ? response.json() as Promise<{ demoMode: boolean }> : { demoMode: false }),
      fetch('/api/auth/me').then(async (response) => response.ok ? response.json() as Promise<{ user: SessionUser }> : null),
    ]).then(([config, session]) => {
      if (!active) return;
      setDemoMode(config.demoMode);
      setUser(session?.user ?? null);
    }).catch(() => {
      if (active) setUser(null);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const login = useCallback(async (identifier: string) => {
    const response = await fetch('/api/auth/demo-login', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier }),
    });
    const result = await response.json() as { user?: SessionUser; message?: string };
    if (!response.ok || !result.user) throw new Error(result.message ?? 'No fue posible iniciar sesión. Intenta nuevamente.');
    setUser(result.user);
    setDemoMode(true);
  }, []);

  const logout = useCallback(async () => {
    const response = await fetch('/api/auth/logout', { method: 'POST' });
    if (!response.ok) throw new Error('No fue posible cerrar la sesión. Intenta nuevamente.');
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  const value = useMemo(() => ({ user, demoMode, loading, login, logout }), [user, demoMode, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('La sesión requiere su proveedor de autenticación.');
  return value;
}
