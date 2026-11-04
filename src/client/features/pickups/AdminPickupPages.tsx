import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PickupStatus } from '../../../shared/pickup.js';
import { formatPickupDate } from '../../../shared/pickup-date-format.js';
import { LogoutButton } from '../../components/LogoutButton.js';
import { PickupRequestDays } from './GuardianPickupPages.js';

interface PickupStudent { id: string; fullName: string; courseName: string }
interface PickupDay { date: string; students: PickupStudent[] }
interface PickupRow {
  id: string;
  status: PickupStatus;
  submittedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  externalPerson: { firstName: string; lastName: string; documentType: string; documentNumber: string; relationship: string; documentId: string } | null;
  days: PickupDay[];
  matchedDays?: PickupDay[];
  dayCount?: number;
  guardian?: { fullName: string; email: string | null; phone: string | null };
  documents?: { guardian: { id: string; available: boolean }; external: { id: string | null; available: boolean } };
  reviewedBy?: { id: string; fullName: string } | null;
}
interface PickupList { items: PickupRow[]; page: number; pageSize: number; total: number }
class AdminPickupError extends Error {}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) throw new AdminPickupError(body.message ?? 'No fue posible cargar la información. Intenta nuevamente.');
  return body as T;
}

function AdminHeader({ back }: { back?: { href: string; label: string } }) {
  return <header className="header">
    <nav className="admin-nav" aria-label="Secciones de administración">
      {back && <Link to={back.href}>{back.label}</Link>}
      <Link to="/admin/eventos">Eventos</Link>
      <Link to="/admin/retiros">Retiros</Link>
    </nav>
    <span className="wordmark">Colegio</span>
    <LogoutButton />
  </header>;
}

export function AdminPickupsPage() {
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<PickupStatus | ''>('PENDING_REVIEW');
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), pageSize: '20' });
  if (date) params.set('date', date);
  if (status) params.set('status', status);
  const query = useQuery({ queryKey: ['admin-pickups', date, status, page], queryFn: () => fetchJson<PickupList>(`/api/admin/pickups?${params.toString()}`) });

  return <main className="page">
    <AdminHeader />
    <section className="welcome"><p className="eyebrow">Panel de administración</p><h1>Retiros externos</h1><p>Revisa la solicitud completa. Aprobar o rechazar afecta a todos sus días y estudiantes.</p></section>
    <section className="filter-panel pickup-admin-filters" aria-label="Filtrar solicitudes">
      <h2>Filtrar solicitudes</h2>
      <label htmlFor="pickup-date-filter">Fecha de retiro</label>
      <input id="pickup-date-filter" type="date" value={date} onChange={(event) => { setDate(event.target.value); setPage(1); }} />
      <label htmlFor="pickup-status-filter">Estado</label>
      <select id="pickup-status-filter" className="pickup-select" value={status} onChange={(event) => { setStatus(event.target.value as PickupStatus | ''); setPage(1); }}>
        <option value="">Todos los estados</option>
        <option value="PENDING_REVIEW">Pendiente de revisión</option>
        <option value="APPROVED">Aprobada</option>
        <option value="REJECTED">Rechazada</option>
      </select>
    </section>
    {query.isPending && <p role="status">Cargando solicitudes…</p>}
    {query.isError && <p role="alert" className="error-message">{query.error.message}</p>}
    {query.data?.items.length === 0 && <section className="empty-state"><h2>No hay solicitudes para esos filtros</h2><p>Prueba con otra fecha o estado.</p></section>}
    {query.data?.items.length ? <>
      <p>{query.data.total} solicitudes encontradas</p>
      <div className="event-list">{query.data.items.map((request) => <article className="event-card" key={request.id}>
        <p className={`pickup-status ${request.status === 'APPROVED' ? 'approved' : request.status === 'REJECTED' ? 'rejected' : 'pending'}`}>{statusLabel(request.status)}</p>
        <h2><Link to={`/admin/retiros/${request.id}`}>Solicitud de retiro</Link></h2>
        {request.guardian && <p>Apoderado: {request.guardian.fullName}</p>}
        <p>{(request.matchedDays ?? request.days).flatMap((day) => day.students.map((student) => `${student.fullName} · ${formatPickupDate(day.date)}`)).join(' · ')}</p>
        {request.dayCount && request.dayCount > 1 && <p>El detalle muestra el lote completo de {request.dayCount} días.</p>}
        {request.externalPerson && <p>Retira: {request.externalPerson.firstName} {request.externalPerson.lastName}</p>}
      </article>)}</div>
      <div className="pickup-pagination">
        <button className="button outline-button" type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Anterior</button>
        <span>Página {page}</span>
        <button className="button outline-button" type="button" disabled={page * 20 >= query.data.total} onClick={() => setPage((current) => current + 1)}>Siguiente</button>
      </div>
    </> : null}
  </main>;
}

export function AdminPickupDetailPage() {
  const { id } = useParams();
  const client = useQueryClient();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const query = useQuery({ queryKey: ['admin-pickup', id], queryFn: () => fetchJson<PickupRow>(`/api/admin/pickups/${id}`), enabled: Boolean(id) });

  const review = async (decision: 'APPROVE' | 'REJECT') => {
    if (!id || submitting) return;
    if (decision === 'REJECT' && !reason.trim()) {
      setError('Ingresa un motivo para rechazar la solicitud.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await fetchJson(`/api/admin/pickups/${id}/review`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ decision, ...(decision === 'REJECT' ? { reason } : {}) }) });
      await Promise.all([client.invalidateQueries({ queryKey: ['admin-pickup', id] }), client.invalidateQueries({ queryKey: ['admin-pickups'] })]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible revisar la solicitud. Intenta nuevamente.');
      await client.invalidateQueries({ queryKey: ['admin-pickup', id] });
    } finally {
      setSubmitting(false);
    }
  };

  return <main className="page">
    <AdminHeader back={{ href: '/admin/retiros', label: 'Volver a retiros' }} />
    {query.isPending && <p role="status">Cargando solicitud…</p>}
    {query.isError && <p role="alert" className="error-message">{query.error.message}</p>}
    {query.data && <>
      <section className="welcome"><p className="eyebrow">Revisión de solicitud</p><h1>Retiro externo</h1><p className={`pickup-status ${query.data.status === 'APPROVED' ? 'approved' : query.data.status === 'REJECTED' ? 'rejected' : 'pending'}`}>{statusLabel(query.data.status)}</p><p>La decisión se aplica al lote completo.</p></section>
      {query.data.guardian && <section className="pickup-panel"><h2>Apoderado solicitante</h2><p>{query.data.guardian.fullName}</p>{query.data.guardian.email && <p>Correo: {query.data.guardian.email}</p>}{query.data.guardian.phone && <p>Teléfono: {query.data.guardian.phone}</p>}</section>}
      <PickupRequestDays request={query.data} />
      {query.data.externalPerson && <section className="pickup-panel"><h2>Persona externa</h2><p>{query.data.externalPerson.firstName} {query.data.externalPerson.lastName}</p><p>{query.data.externalPerson.documentType}: {query.data.externalPerson.documentNumber}</p><p>Vínculo: {query.data.externalPerson.relationship}</p></section>}
      <section className="pickup-panel"><h2>Documentos de identidad</h2>
        <p>Documento del apoderado: {query.data.documents?.guardian.available ? <a href={`/api/documents/${query.data.documents.guardian.id}`}>Abrir documento</a> : 'No disponible'}</p>
        <p>Documento del externo: {query.data.documents?.external.available && query.data.documents.external.id ? <a href={`/api/documents/${query.data.documents.external.id}`}>Abrir documento</a> : 'No disponible'}</p>
      </section>
      {query.data.status === 'PENDING_REVIEW' && <section className="pickup-panel" aria-label="Resolver solicitud">
        <h2>Resolver el lote</h2>
        <p>Al aprobar, todos los días y estudiantes quedarán autorizados. Si rechazas, la solicitud completa se rechazará y deberás ingresar un motivo.</p>
        <label htmlFor="pickup-rejection-reason">Motivo de rechazo</label>
        <textarea id="pickup-rejection-reason" className="pickup-textarea" maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
        {error && <p role="alert" className="error-message">{error}</p>}
        <div className="pickup-review-actions">
          <button className="button outline-button" type="button" disabled={submitting} onClick={() => void review('REJECT')}>{submitting ? 'Guardando…' : 'Rechazar con motivo'}</button>
          <button className="button primary-button" type="button" disabled={submitting || !query.data.documents?.guardian.available || !query.data.documents.external.available} onClick={() => void review('APPROVE')}>{submitting ? 'Guardando…' : 'Aprobar lote completo'}</button>
        </div>
      </section>}
      {query.data.rejectionReason && <section className="pickup-panel"><h2>Motivo del rechazo</h2><p>{query.data.rejectionReason}</p></section>}
    </>}
  </main>;
}

function statusLabel(status: PickupStatus) {
  return status === 'APPROVED' ? 'Aprobada' : status === 'REJECTED' ? 'Rechazada' : status === 'CANCELLED' ? 'Cancelada' : 'Pendiente de revisión';
}
