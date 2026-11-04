import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { externalPersonInputSchema, pickupSubmissionSchema, type PickupStatus } from '../../../shared/pickup.js';
import { formatPickupDate } from '../../../shared/pickup-date-format.js';
import { LogoutButton } from '../../components/LogoutButton.js';
import { getPickupDays, usePickupSelection, validatePickupSelection } from './PickupSelectionProvider.js';

interface PickupStudent { id: string; fullName: string; courseName: string }
interface PickupContext { today: string; currentMonth: string; nextMonth: string; eligibleDates: string[]; students: PickupStudent[] }
interface PickupDayView { date: string; students: Array<{ id: string; fullName: string; courseName: string }> }
interface PickupExternalView { firstName: string; lastName: string; documentType: string; documentNumber: string; relationship: string; documentId: string }
interface PickupView { id: string; status: PickupStatus; submittedAt: string; reviewedAt: string | null; rejectionReason: string | null; externalPerson: PickupExternalView | null; days: PickupDayView[] }
interface PickupList { items: PickupView[]; page: number; pageSize: number; total: number }
interface PickupRequestDetail extends PickupView {}

class PickupHttpError extends Error {
  constructor(message: string, readonly code: string, readonly details?: unknown) { super(message); }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({})) as { message?: string; code?: string; details?: unknown };
  if (!response.ok) throw new PickupHttpError(body.message ?? 'No fue posible completar la solicitud. Intenta nuevamente.', body.code ?? 'REQUEST_FAILED', body.details);
  return body as T;
}

const statusLabel: Record<PickupStatus, string> = {
  PENDING_REVIEW: 'Pendiente de revisión', APPROVED: 'Aprobada', REJECTED: 'Rechazada', CANCELLED: 'Cancelada',
};

function statusClass(status: PickupStatus) {
  return status === 'APPROVED' ? 'pickup-status approved' : status === 'REJECTED' ? 'pickup-status rejected' : 'pickup-status pending';
}

function PageHeader({ back }: { back?: { href: string; label: string } }) {
  return <header className="header">
    {back ? <Link to={back.href}>{back.label}</Link> : <span className="wordmark">Colegio</span>}
    {back && <span className="wordmark">Colegio</span>}
    <LogoutButton />
  </header>;
}

export function GuardianPickupCalendarPage() {
  const context = useQuery({ queryKey: ['pickup-context'], queryFn: () => requestJson<PickupContext>('/api/guardian/pickups/context'), refetchOnWindowFocus: true });
  const form = usePickupSelection();
  const navigate = useNavigate();
  const location = useLocation();
  const [visibleMonth, setVisibleMonth] = useState<string | null>(null);
  const [showPerDay, setShowPerDay] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (context.data) {
      form.initialize(context.data.students.map(({ id }) => id));
      setVisibleMonth((current) => current ?? context.data!.currentMonth);
    }
  }, [context.data, form.initialize]);

  const selection = form.selection;
  const students = context.data?.students ?? [];
  const activeIds = students.map(({ id }) => id);
  const selectedDays = selection ? Object.values(selection.days).sort((left, right) => left.date.localeCompare(right.date)) : [];
  const validation = selection ? validatePickupSelection(selection) : { valid: false, emptyDates: [] as string[] };
  const eligible = useMemo(() => new Set(context.data?.eligibleDates ?? []), [context.data?.eligibleDates]);
  const month = visibleMonth ?? context.data?.currentMonth ?? '';
  const [year, monthNumber] = month.split('-').map(Number);
  const firstDay = new Date(Date.UTC(year || 2000, (monthNumber || 1) - 1, 1));
  const blanks = (firstDay.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year || 2000, monthNumber || 1, 0)).getUTCDate();
  const monthLabel = month ? new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00.000Z`)) : '';
  const notice = (location.state as { notice?: string } | null)?.notice;

  if (context.isPending) return <main className="page"><p role="status">Cargando el calendario…</p></main>;
  if (context.isError) return <main className="page"><PageHeader /><p role="alert" className="error-message">{context.error.message}</p><button className="button primary-button" onClick={() => void context.refetch()}>Volver a intentar</button></main>;

  const toggleCommonStudent = (studentId: string, checked: boolean) => {
    const current = selection?.commonStudentIds ?? activeIds;
    form.setCommon(checked ? [...current, studentId] : current.filter((id) => id !== studentId));
  };
  const getNames = (studentIds: string[]) => studentIds.map((id) => students.find((student) => student.id === id)?.fullName).filter(Boolean).join(', ');
  const continueToExternal = () => {
    if (!validation.valid) {
      setError(validation.emptyDates.length ? 'Selecciona al menos un estudiante para cada día o quita esos días.' : 'Selecciona uno o más días para continuar.');
      return;
    }
    setError('');
    void context.refetch();
    navigate('/retiros/externo');
  };

  return <main className="page">
    <PageHeader back={{ href: '/', label: 'Volver al inicio' }} />
    <section className="welcome"><p className="eyebrow">Retiro externo</p><h1>¿Qué días retirarán a tus estudiantes?</h1><p>Selecciona uno o más días. Cada día nuevo incluye a todos tus estudiantes.</p></section>
    {notice && <p role="status" className="pickup-info">{notice}</p>}
    {students.length === 0 ? <section className="empty-state"><h2>No tienes estudiantes activos vinculados</h2><p>Si crees que esto es un error, comunícate con el colegio.</p><Link to="/retiros/solicitudes">Ver mis solicitudes</Link></section> : <>
      <section className="pickup-calendar-panel" aria-label="Calendario de retiros">
        <div className="pickup-calendar-heading">
          <button type="button" className="button outline-button" aria-label="Mostrar mes actual" disabled={month === context.data.currentMonth} onClick={() => setVisibleMonth(context.data.currentMonth)}>‹</button>
          <h2>{monthLabel}</h2>
          <button type="button" className="button outline-button" aria-label="Mostrar mes siguiente" disabled={month === context.data.nextMonth} onClick={() => setVisibleMonth(context.data.nextMonth)}>›</button>
        </div>
        <div className="pickup-calendar-grid" aria-label={monthLabel}>
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((weekday) => <span className="pickup-weekday" key={weekday}>{weekday}</span>)}
          {Array.from({ length: blanks }, (_, index) => <span className="pickup-calendar-blank" aria-hidden="true" key={`blank-${index}`} />)}
          {Array.from({ length: daysInMonth }, (_, index) => {
            const date = `${month}-${String(index + 1).padStart(2, '0')}`;
            const day = selection?.days[date];
            const canSelect = eligible.has(date);
            const label = `${formatPickupDate(date)}${day ? ', seleccionado' : ''}${canSelect ? '' : ', no disponible'}`;
            return <button key={date} type="button" className={`pickup-day${day ? ' selected' : ''}`} aria-label={label} aria-pressed={Boolean(day)} disabled={!canSelect} onClick={() => {
              setError('');
              if (day) form.removeDay(date);
              else form.addDay(date, activeIds);
            }}>{index + 1}</button>;
          })}
        </div>
        <p className="helper">Puedes elegir desde mañana. Sábados y domingos no están disponibles; los feriados no se distinguen en el calendario.</p>
      </section>

      <section className="pickup-panel">
        <h2>Estudiantes incluidos</h2>
        <p>Elige quiénes retirarán en los días seleccionados. Tus cambios se aplican a los días que no hayas personalizado.</p>
        <div className="student-list">
          {students.map((student) => <label className="student-option" key={student.id}>
            <input type="checkbox" checked={Boolean(selection?.commonStudentIds.includes(student.id))} onChange={(event) => toggleCommonStudent(student.id, event.target.checked)} />
            <span>{student.fullName}<small>{student.courseName}</small></span>
          </label>)}
        </div>
        {selectedDays.length > 0 && <p className="pickup-info">{selection?.commonStudentIds.length === activeIds.length ? 'Todos tus estudiantes están incluidos en la selección común.' : 'La selección común se aplica solo a los días sin ajustes propios.'}</p>}
      </section>

      {selectedDays.length > 0 && <section className="pickup-panel">
        <h2>Días seleccionados: {selectedDays.length}</h2>
        <div className="pickup-selected-days">
          {selectedDays.map((day) => {
            const differs = day.studentIds.length !== (selection?.commonStudentIds.length ?? 0) || day.studentIds.some((id) => !selection?.commonStudentIds.includes(id));
            return <article className="pickup-selected-day" key={day.date}>
              <h3>{formatPickupDate(day.date)}</h3>
              <p>{getNames(day.studentIds) || 'Aún no has seleccionado estudiantes.'}</p>
              {differs && <span className="status-chip">Selección distinta</span>}
              <button className="link-button" type="button" onClick={() => form.removeDay(day.date)}>Quitar este día</button>
            </article>;
          })}
        </div>
        <button className="link-button" type="button" aria-expanded={showPerDay} onClick={() => setShowPerDay((current) => !current)}>Cambiar estudiantes por día</button>
        {showPerDay && <div className="pickup-day-customization">
          {selectedDays.map((day) => <fieldset className="pickup-day-fieldset" key={day.date}>
            <legend>{formatPickupDate(day.date)}</legend>
            {students.map((student) => <label className="student-option" key={student.id}>
              <input type="checkbox" checked={day.studentIds.includes(student.id)} onChange={(event) => form.setDayStudents(day.date, event.target.checked ? [...day.studentIds, student.id] : day.studentIds.filter((id) => id !== student.id))} />
              <span>{student.fullName}<small>{student.courseName}</small></span>
            </label>)}
            {day.studentIds.length === 0 && <p role="alert" className="error-message">Selecciona al menos un estudiante o quita este día.</p>}
            {day.customized && <button className="link-button" type="button" onClick={() => form.resetDay(day.date)}>Volver a la selección común</button>}
          </fieldset>)}
        </div>}
      </section>}

      {error && <p role="alert" className="error-message">{error}</p>}
      <div className="pickup-actions"><Link to="/retiros/solicitudes">Mis solicitudes</Link><button className="button primary-button" type="button" onClick={continueToExternal}>Continuar</button></div>
    </>}
  </main>;
}

export function GuardianPickupExternalPage() {
  const context = usePickupSelection();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState<'guardian' | 'external' | null>(null);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const guardianDocumentRef = useRef(context.guardianDocumentId);
  guardianDocumentRef.current = context.guardianDocumentId;
  if (!context.selection || !Object.keys(context.selection.days).length) return <Navigate to="/retiros" replace state={{ notice: 'Primero selecciona los días y estudiantes.' }} />;

  const upload = async (file: File, kind: 'guardian' | 'external') => {
    setError('');
    setFieldError('');
    const guardianDocumentId = guardianDocumentRef.current ?? context.guardianDocumentId;
    if (kind === 'external' && !guardianDocumentId) {
      setError('Sube primero el documento del apoderado.');
      return;
    }
    setUploading(kind);
    if (kind === 'guardian') {
      guardianDocumentRef.current = null;
      context.setGuardianDocument(null);
    }
    const query = kind === 'guardian' ? '' : `?type=EXTERNAL_IDENTITY&guardianDocumentId=${guardianDocumentId}`;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(`/api/documents${query}`, { method: 'POST', body: formData });
      const body = await response.json() as { documentId?: string; message?: string };
      if (!response.ok || !body.documentId) throw new Error(body.message ?? 'No fue posible subir el documento. Intenta nuevamente.');
      if (kind === 'guardian') {
        guardianDocumentRef.current = body.documentId;
        context.setGuardianDocument(body.documentId);
      }
      else context.setExternalDocument(body.documentId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible subir el documento. Intenta nuevamente.');
    } finally {
      setUploading(null);
    }
  };

  const continueToSummary = () => {
    if (!context.guardianDocumentId || !context.externalDocumentId) {
      setFieldError('Adjunta primero tu documento y luego el documento de la persona externa.');
      return;
    }
    const parsed = externalPersonInputSchema.safeParse({ ...context.externalPerson, documentId: context.externalDocumentId });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Revisa los datos de la persona externa.');
      return;
    }
    navigate('/retiros/resumen');
  };

  return <main className="page narrow">
    <PageHeader back={{ href: '/retiros', label: 'Volver al calendario' }} />
    <section className="welcome"><p className="eyebrow">Paso 2 de 3</p><h1>¿Quién retirará a tus estudiantes?</h1><p>La misma persona puede retirar en todos los días seleccionados.</p></section>
    <form className="panel" onSubmit={(event) => { event.preventDefault(); continueToSummary(); }}>
      <label htmlFor="external-first-name">Nombres</label>
      <input id="external-first-name" required maxLength={100} value={context.externalPerson.firstName} onChange={(event) => context.updateExternalPerson({ firstName: event.target.value })} />
      <label htmlFor="external-last-name">Apellidos</label>
      <input id="external-last-name" required maxLength={100} value={context.externalPerson.lastName} onChange={(event) => context.updateExternalPerson({ lastName: event.target.value })} />
      <label htmlFor="external-document-type">Tipo de documento</label>
      <select id="external-document-type" className="pickup-select" value={context.externalPerson.documentType} onChange={(event) => context.updateExternalPerson({ documentType: event.target.value as 'RUT' | 'PASSPORT' })}>
        <option value="RUT">RUT</option><option value="PASSPORT">Pasaporte</option>
      </select>
      <label htmlFor="external-document-number">{context.externalPerson.documentType === 'RUT' ? 'RUT' : 'Número de pasaporte'}</label>
      <input id="external-document-number" required maxLength={30} autoComplete="off" value={context.externalPerson.documentNumber} onChange={(event) => context.updateExternalPerson({ documentNumber: event.target.value })} />
      <label htmlFor="external-relationship">Parentesco o vínculo</label>
      <input id="external-relationship" required maxLength={80} value={context.externalPerson.relationship} onChange={(event) => context.updateExternalPerson({ relationship: event.target.value })} />

      <section className="pickup-document-step" aria-labelledby="guardian-document-heading">
        <h2 id="guardian-document-heading">1. Documento del apoderado</h2>
        <label className="pickup-file-control" htmlFor="guardian-document-file">
          <span>{context.guardianDocumentId ? 'Documento del apoderado cargado' : 'Subir o tomar foto del documento'}</span>
          <small>JPG, PNG o PDF · máximo 10 MB</small>
          <input id="guardian-document-file" type="file" accept="image/jpeg,image/png,application/pdf" capture="environment" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void upload(file, 'guardian'); event.currentTarget.value = ''; }} />
        </label>
        {uploading === 'guardian' && <p role="status">Subiendo documento del apoderado…</p>}
      </section>
      <section className="pickup-document-step" aria-labelledby="external-document-heading">
        <h2 id="external-document-heading">2. Documento del externo</h2>
        <label className={`pickup-file-control${!context.guardianDocumentId ? ' disabled' : ''}`} htmlFor="external-document-file">
          <span>{context.externalDocumentId ? 'Documento del externo cargado' : 'Subir o tomar foto del documento'}</span>
          <small>JPG, PNG o PDF · máximo 10 MB</small>
          <input id="external-document-file" type="file" accept="image/jpeg,image/png,application/pdf" capture="environment" disabled={!context.guardianDocumentId || uploading !== null} onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void upload(file, 'external'); event.currentTarget.value = ''; }} />
        </label>
        {uploading === 'external' && <p role="status">Subiendo documento del externo…</p>}
      </section>
      {error && <p role="alert" className="error-message">{error}</p>}
      {fieldError && <p role="alert" className="error-message">{fieldError}</p>}
      <button className="button primary-button" type="submit" disabled={uploading !== null}>Revisar solicitud</button>
    </form>
  </main>;
}

export function GuardianPickupSummaryPage() {
  const form = usePickupSelection();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const context = useQuery({ queryKey: ['pickup-context'], queryFn: () => requestJson<PickupContext>('/api/guardian/pickups/context') });
  const selection = form.selection;
  const days = selection ? getPickupDays(selection) : [];
  const valid = Boolean(selection && validatePickupSelection(selection).valid && form.guardianDocumentId && form.externalDocumentId);
  if (!selection || !Object.keys(selection.days).length) return <Navigate to="/retiros" replace state={{ notice: 'Selecciona los días y estudiantes antes de revisar la solicitud.' }} />;
  if (!form.guardianDocumentId || !form.externalDocumentId) return <Navigate to="/retiros/externo" replace state={{ notice: 'Adjunta los documentos para continuar.' }} />;
  const studentName = (id: string) => context.data?.students.find((student) => student.id === id)?.fullName ?? 'Estudiante';

  const send = async () => {
    if (!valid) return;
    setSubmitting(true);
    setError('');
    const person = externalPersonInputSchema.safeParse({ ...form.externalPerson, documentId: form.externalDocumentId });
    if (!person.success) {
      setError(person.error.issues[0]?.message ?? 'Revisa los datos de la persona externa.');
      setSubmitting(false);
      return;
    }
    const input = pickupSubmissionSchema.safeParse({
      idempotencyKey: form.submissionKey(),
      guardianDocumentId: form.guardianDocumentId,
      externalPerson: person.data,
      days,
    });
    if (!input.success) {
      setError(input.error.issues[0]?.message ?? 'Revisa la información antes de enviar.');
      setSubmitting(false);
      return;
    }
    try {
      const result = await requestJson<{ pickupRequestId: string }>('/api/guardian/pickups', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input.data),
      });
      navigate(`/retiros/solicitudes/${result.pickupRequestId}`, { replace: true, state: { notice: 'Solicitud recibida. Está pendiente de revisión del colegio; el retiro aún no está autorizado.' } });
    } catch (cause) {
      if (cause instanceof PickupHttpError && cause.code === 'PICKUP_CONFLICT') {
        const details = cause.details as { conflicts?: Array<{ date: string; studentName: string }> } | undefined;
        const names = details?.conflicts?.map(({ date, studentName: name }) => `${name} (${formatPickupDate(date)})`).join(', ');
        setError(names ? `${cause.message} Conflictos: ${names}.` : cause.message);
      } else {
        setError(cause instanceof Error ? cause.message : 'No fue posible enviar la solicitud. Intenta nuevamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return <main className="page narrow">
    <PageHeader back={{ href: '/retiros/externo', label: 'Volver a los datos' }} />
    <section className="welcome"><p className="eyebrow">Paso 3 de 3</p><h1>Revisa antes de enviar</h1><p>El colegio revisará la solicitud. El retiro todavía no está autorizado.</p></section>
    <section className="summary-card pickup-summary" aria-labelledby="pickup-summary-heading">
      <h2 id="pickup-summary-heading">Resumen del retiro</h2>
      {days.map((day) => <article className="summary-pair" key={day.date}>
        <dt>Fecha</dt><dd>{formatPickupDate(day.date)}</dd>
        <dt>Estudiantes</dt><dd>{day.studentIds.map(studentName).join(', ')}</dd>
      </article>)}
      <article className="summary-pair">
        <dt>Persona externa</dt><dd>{form.externalPerson.firstName} {form.externalPerson.lastName}</dd>
        <dt>Documento</dt><dd>{form.externalPerson.documentType}: {form.externalPerson.documentNumber}</dd>
        <dt>Vínculo</dt><dd>{form.externalPerson.relationship}</dd>
        <dt>Documentos</dt><dd>Apoderado y externo adjuntados</dd>
      </article>
      <p>Autorizas a esta persona a retirar a los estudiantes indicados en las fechas seleccionadas. El retiro será válido solo cuando dirección apruebe la solicitud.</p>
    </section>
    {error && <p role="alert" className="error-message">{error}</p>}
    <button className="button primary-button full-width" type="button" onClick={() => void send()} disabled={!valid || submitting}>
      {submitting ? 'Enviando solicitud…' : 'Enviar solicitud'}
    </button>
  </main>;
}

export function GuardianPickupRequestsPage() {
  const query = useQuery({ queryKey: ['guardian-pickups'], queryFn: () => requestJson<PickupList>('/api/guardian/pickups') });
  return <main className="page">
    <PageHeader back={{ href: '/retiros', label: 'Volver a retiros' }} />
    <section className="welcome"><p className="eyebrow">Retiro externo</p><h1>Mis solicitudes</h1><p>Un retiro está autorizado solo cuando aparece como aprobado.</p></section>
    {query.isPending && <p role="status">Cargando tus solicitudes…</p>}
    {query.isError && <p role="alert" className="error-message">{query.error.message}</p>}
    {query.data?.items.length === 0 && <section className="empty-state"><h2>Aún no tienes solicitudes</h2><Link to="/retiros">Solicitar un retiro externo</Link></section>}
    {query.data?.items.length ? <div className="event-list">{query.data.items.map((request) => <PickupRequestCard key={request.id} request={request} />)}</div> : null}
  </main>;
}

export function GuardianPickupRequestDetailPage() {
  const { id } = useParams();
  const pickupForm = usePickupSelection();
  const query = useQuery({ queryKey: ['guardian-pickup', id], queryFn: () => requestJson<PickupRequestDetail>(`/api/guardian/pickups/${id}`), enabled: Boolean(id) });
  const location = useLocation();
  useEffect(() => { pickupForm.clear(); }, [id, pickupForm.clear]);
  return <main className="page">
    <PageHeader back={{ href: '/retiros/solicitudes', label: 'Mis solicitudes' }} />
    {(location.state as { notice?: string } | null)?.notice && <p role="status" className="pickup-info">{(location.state as { notice: string }).notice}</p>}
    {query.isPending && <p role="status">Cargando la solicitud…</p>}
    {query.isError && <p role="alert" className="error-message">{query.error.message}</p>}
    {query.data && <section className="welcome"><p className="eyebrow">Retiro externo</p><h1>Estado de la solicitud</h1><p className={statusClass(query.data.status)}>{statusLabel[query.data.status]}</p>{query.data.status === 'PENDING_REVIEW' && <p>El colegio recibió la solicitud. El retiro aún no está autorizado.</p>}{query.data.rejectionReason && <p>Motivo del rechazo: {query.data.rejectionReason}</p>}</section>}
    {query.data && <PickupRequestDays request={query.data} />}
  </main>;
}

function PickupRequestCard({ request }: { request: PickupView }) {
  return <article className="event-card pickup-request-card">
    <p className={statusClass(request.status)}>{statusLabel[request.status]}</p>
    <h2><Link to={`/retiros/solicitudes/${request.id}`}>Solicitud de retiro</Link></h2>
    <p>Enviada: {new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeZone: 'America/Santiago' }).format(new Date(request.submittedAt))}</p>
    <p>{request.days.length} {request.days.length === 1 ? 'día seleccionado' : 'días seleccionados'}</p>
    {request.rejectionReason && <p>Motivo: {request.rejectionReason}</p>}
  </article>;
}

export function PickupRequestDays({ request }: { request: PickupView }) {
  return <div className="event-list">{request.days.map((day) => <article className="event-card" key={day.date}>
    <h2>{formatPickupDate(day.date)}</h2>
    <ul>{day.students.map((student) => <li key={student.id}>{student.fullName} · {student.courseName}</li>)}</ul>
    {request.externalPerson && <p>Retira: {request.externalPerson.firstName} {request.externalPerson.lastName} ({request.externalPerson.relationship})</p>}
  </article>)}</div>;
}
