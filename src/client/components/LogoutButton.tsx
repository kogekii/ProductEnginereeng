import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider.js';
import { useAuthorizationSelection } from '../features/authorizations/AuthorizationSelectionProvider.js';

export function LogoutButton() {
  const { logout } = useAuth();
  const selection = useAuthorizationSelection();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function closeSession() {
    setPending(true);
    setError('');
    try {
      await logout();
      selection.clear();
      sessionStorage.removeItem('authorization-selection-v1');
      navigate('/login', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible cerrar la sesión. Intenta nuevamente.');
    } finally { setPending(false); }
  }

  return <>
    <button className="link-button" type="button" disabled={pending} onClick={() => void closeSession()}>{pending ? 'Cerrando sesión…' : 'Cerrar sesión'}</button>
    {error && <span className="logout-error" role="alert">{error}</span>}
  </>;
}
