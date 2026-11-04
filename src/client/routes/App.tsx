import { Link, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import React from 'react';
import { AuthorizationSelectionProvider } from '../features/authorizations/AuthorizationSelectionProvider.js';
import { AuthProvider, useAuth } from '../features/auth/AuthProvider.js';
import { AuthorizationEventsPage, AuthorizationResultPage, AuthorizationSummaryPage } from '../features/authorizations/AuthorizationPages.js';
import { AdminEventPendingPage, AdminEventsPage } from '../features/admin/AdminEventPages.js';
import { LogoutButton } from '../components/LogoutButton.js';
import { PickupSelectionProvider } from '../features/pickups/PickupSelectionProvider.js';
import { GuardianPickupCalendarPage, GuardianPickupExternalPage, GuardianPickupRequestDetailPage, GuardianPickupRequestsPage, GuardianPickupSummaryPage } from '../features/pickups/GuardianPickupPages.js';
import { AdminPickupDetailPage, AdminPickupsPage } from '../features/pickups/AdminPickupPages.js';

function Home() {
  const { user } = useAuth();
  return <main className="page"><header className="header"><span className="wordmark">Colegio</span><LogoutButton /></header>
    <section className="welcome"><p className="eyebrow">Portal de familias</p><h1>Hola, {user?.firstName}</h1><p>Revisa las autorizaciones de tus estudiantes.</p></section>
    <nav className="actions" aria-label="Acciones principales"><Link className="action primary" to="/autorizaciones"><strong>Firmar autorización</strong><span>Revisa los eventos que aplican a tus estudiantes</span></Link><Link className="action secondary" to="/retiros"><strong>Retiro externo</strong><span>Autoriza a una persona para retirar</span></Link></nav>
  </main>;
}

function Login() {
  const { login, demoMode, loading, user } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = React.useState('');
  const [error, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  if (loading) return <main className="page"><p role="status">Cargando…</p></main>;
  if (user) return <Navigate to={user.isAdmin ? '/admin/eventos' : '/'} replace />;
  return <main className="page narrow"><header className="header"><span className="wordmark">Colegio</span></header><section className="welcome"><p className="eyebrow">Acceso de apoderados</p><h1>Ingresa a tu cuenta</h1><p>Usa el correo o teléfono registrado en el colegio.</p></section>
    <form className="panel" onSubmit={(event) => { event.preventDefault(); setSubmitting(true); setError(''); void login(identifier).then(() => navigate('/')).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No fue posible iniciar sesión.')).finally(() => setSubmitting(false)); }}>
      <label htmlFor="identifier">Correo electrónico o teléfono</label><input id="identifier" name="identifier" required autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} aria-invalid={Boolean(error)} />
      {error && <p role="alert" className="error-message">{error}</p>}
      <button className="button primary-button" type="submit" disabled={submitting}>{submitting ? 'Ingresando…' : 'Continuar'}</button>
      {demoMode && <aside className="demo-accounts"><h2>Cuentas de demostración</h2><ul><li><button type="button" onClick={() => setIdentifier('apoderado1@colegio.example')}>Apoderado: apoderado1@colegio.example</button></li><li><button type="button" onClick={() => setIdentifier('apoderado2@colegio.example')}>Apoderado: apoderado2@colegio.example</button></li><li><button type="button" onClick={() => setIdentifier('apoderado3@colegio.example')}>Apoderado: apoderado3@colegio.example</button></li><li><button type="button" onClick={() => setIdentifier('admin@colegio.example')}>Administrador: admin@colegio.example</button></li></ul></aside>}
    </form>
  </main>;
}

export default function App() {
  return <AuthProvider><AuthorizationSelectionProvider><PickupSelectionProvider><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<GuardianRoute><Home /></GuardianRoute>} />
    <Route path="/autorizaciones" element={<GuardianRoute><AuthorizationEventsPage /></GuardianRoute>} />
    <Route path="/autorizaciones/resumen" element={<GuardianRoute><AuthorizationSummaryPage /></GuardianRoute>} />
    <Route path="/autorizaciones/resultado" element={<GuardianRoute><AuthorizationResultPage /></GuardianRoute>} />
    <Route path="/retiros" element={<GuardianRoute><GuardianPickupCalendarPage /></GuardianRoute>} />
    <Route path="/retiros/externo" element={<GuardianRoute><GuardianPickupExternalPage /></GuardianRoute>} />
    <Route path="/retiros/resumen" element={<GuardianRoute><GuardianPickupSummaryPage /></GuardianRoute>} />
    <Route path="/retiros/solicitudes" element={<GuardianRoute><GuardianPickupRequestsPage /></GuardianRoute>} />
    <Route path="/retiros/solicitudes/:id" element={<GuardianRoute><GuardianPickupRequestDetailPage /></GuardianRoute>} />
    <Route path="/admin/eventos" element={<AdminRoute><AdminEventsPage /></AdminRoute>} />
    <Route path="/admin/eventos/:id" element={<AdminRoute><AdminEventPendingPage /></AdminRoute>} />
    <Route path="/admin/retiros" element={<AdminRoute><AdminPickupsPage /></AdminRoute>} />
    <Route path="/admin/retiros/:id" element={<AdminRoute><AdminPickupDetailPage /></AdminRoute>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></PickupSelectionProvider></AuthorizationSelectionProvider></AuthProvider>;
}

function GuardianRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <main className="page"><p role="status">Cargando…</p></main>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.isAdmin) return <Navigate to="/admin/eventos" replace />;
  return children;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <main className="page"><p role="status">Cargando…</p></main>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/" replace />;
  return children;
}
