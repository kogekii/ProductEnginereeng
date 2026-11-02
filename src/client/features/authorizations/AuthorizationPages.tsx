import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatInSantiago } from '../../../shared/dates.js';
import { useAuthorizationSelection } from './AuthorizationSelectionProvider.js';

interface EventStudent { id: string; fullName: string; alreadyAuthorized: boolean }
interface AuthorizationEvent {
  id: string; title: string; startsAt: string; endsAt: string; deadlineAt: string;
  purpose: string; allAuthorized: boolean; students: EventStudent[];
}
interface PairResult { eventId: string; studentId: string; eventTitle?: string; studentName?: string; authorizationId?: string; code?: string; message?: string }
interface SubmissionResult { submissionId: string; created: PairResult[]; failed: PairResult[]; createdCount: number; failedCount: number }
const resultKey = 'authorization-result-v1';

function useEvents() {
  const [events, setEvents] = useState<AuthorizationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void fetch('/api/guardian/authorizations/events').then(async (response) => {
      if (!response.ok) throw new Error('No fue posible cargar los eventos. Intenta nuevamente.');
      return response.json() as Promise<AuthorizationEvent[]>;
    }).then((value) => { if (active) setEvents(value); }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Ocurrió un error al cargar los eventos.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return { events, loading, error };
}

export function AuthorizationEventsPage() {
  const { events, loading, error } = useEvents();
  const selection = useAuthorizationSelection();
  const navigate = useNavigate();
  const allPending = events.flatMap((event) => event.students.filter((student) => !student.alreadyAuthorized).map((student) => ({ eventId: event.id, studentId: student.id })));
  return <main className="page">
    <header className="header"><Link to="/">Volver al inicio</Link><span className="wordmark">Colegio</span></header>
    <section className="welcome"><p className="eyebrow">Portal de familias</p><h1>Firmar autorización</h1><p>Selecciona los eventos y estudiantes que vas a autorizar.</p></section>
    {loading && <p role="status">Cargando eventos…</p>}
    {error && <p role="alert" className="error-message">{error}</p>}
    {!loading && !error && events.length === 0 && <div className="empty-state"><h2>No tienes eventos por autorizar</h2><p>Cuando el colegio publique un evento que aplique a tus estudiantes, aparecerá aquí.</p></div>}
    {!loading && events.length > 0 && <div className="event-list">
      <button className="button secondary-button" type="button" disabled={allPending.length === 0} onClick={() => selection.selectMany(allPending)}>Seleccionar todos los eventos</button>
      {events.map((event) => {
        const pending = event.students.filter((student) => !student.alreadyAuthorized);
        return <article className="event-card" key={event.id}>
          <p className="eyebrow">Evento</p><h2>{event.title}</h2>
          <p>{formatInSantiago(new Date(event.startsAt))}</p>
          <dl className="event-metadata"><div><dt>Firma hasta</dt><dd>{formatInSantiago(new Date(event.deadlineAt))}</dd></div></dl>
          {event.allAuthorized && <p className="status-chip">Estudiantes Autorizados</p>}
          <div className="student-list"><h3>Estudiantes</h3>
            {event.students.map((student) => {
              const pair = { eventId: event.id, studentId: student.id };
              return <label className={`student-option${student.alreadyAuthorized ? ' is-authorized' : ''}`} key={student.id}>
                <input type="checkbox" checked={selection.has(pair)} disabled={student.alreadyAuthorized} onChange={() => selection.toggle(pair)} />
                <span>{student.fullName}</span>
                {student.alreadyAuthorized && <strong className="status-chip">Ya autorizada</strong>}
              </label>;
            })}
            <button className="button outline-button" type="button" disabled={pending.length === 0} onClick={() => selection.addMany(pending.map((student) => ({ eventId: event.id, studentId: student.id })))}>Seleccionar todos</button>
            {pending.length === 0 && <p role="status">No quedan estudiantes por autorizar.</p>}
          </div>
        </article>;
      })}
    </div>}
    <div className="selection-bar"><span>{selection.count} autorizaciones seleccionadas</span><button className="button primary-button" type="button" disabled={selection.count === 0 || loading} onClick={() => navigate('/autorizaciones/resumen')}>Continuar al resumen</button></div>
  </main>;
}

export function AuthorizationSummaryPage() {
  const { events, loading, error } = useEvents();
  const selection = useAuthorizationSelection();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const selected = useMemo(() => selection.pairs.flatMap((pair) => {
    const event = events.find(({ id }) => id === pair.eventId);
    const student = event?.students.find(({ id }) => id === pair.studentId);
    return event && student ? [{ pair, event, student }] : [];
  }), [events, selection.pairs]);

  useEffect(() => {
    if (!loading && selection.count === 0) navigate('/autorizaciones', { replace: true });
  }, [loading, navigate, selection.count]);

  async function submit() {
    setSubmitting(true);
    setSubmitError('');
    try {
      const response = await fetch('/api/guardian/authorizations/submissions', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), pairs: selection.pairs }),
      });
      const body = await response.json() as SubmissionResult & { message?: string };
      if (!response.ok) throw new Error(body.message ?? 'No fue posible enviar las autorizaciones.');
      const describe = (pair: PairResult): PairResult => {
        const detail = selected.find(({ pair: selectedPair }) => selectedPair.eventId === pair.eventId && selectedPair.studentId === pair.studentId);
        return { ...pair, eventTitle: detail?.event.title, studentName: detail?.student.fullName };
      };
      sessionStorage.setItem(resultKey, JSON.stringify({ ...body, created: body.created.map(describe), failed: body.failed.map(describe) }));
      navigate('/autorizaciones/resultado');
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : 'Ocurrió un error al enviar las autorizaciones.');
    } finally { setSubmitting(false); }
  }

  if (loading) return <main className="page"><p role="status">Cargando resumen…</p></main>;
  return <main className="page narrow">
    <header className="header"><Link to="/autorizaciones">Volver a la selección</Link><span className="wordmark">Colegio</span></header>
    <section className="welcome"><p className="eyebrow">Resumen obligatorio</p><h1>Revisa antes de firmar</h1><p>Revisa los datos. La autorización queda válida al enviarse.</p></section>
    {error && <p role="alert" className="error-message">{error}</p>}
    <section aria-labelledby="summary-title" className="summary-card"><h2 id="summary-title">Autorizaciones seleccionadas ({selected.length})</h2>
      {selected.map(({ pair, event, student }) => <dl className="summary-pair" key={`${pair.eventId}:${pair.studentId}`}>
        <div><dt>Estudiante</dt><dd>{student.fullName}</dd></div>
        <div><dt>Evento</dt><dd>{event.title}</dd></div>
        <div><dt>Fecha y hora</dt><dd>{formatInSantiago(new Date(event.startsAt))}</dd></div>
        <div><dt>Propósito</dt><dd>{event.purpose}</dd></div>
        <div><dt>Fecha límite</dt><dd>{formatInSantiago(new Date(event.deadlineAt))}</dd></div>
      </dl>)}
    </section>
    <p className="demo-notice">Documento simulado en modo demostración</p>
    {submitError && <p role="alert" className="error-message">{submitError}</p>}
    <button className="button primary-button full-width" type="button" disabled={selected.length === 0 || submitting} onClick={() => void submit()}>{submitting ? 'Enviando…' : 'Confirmar autorización'}</button>
  </main>;
}

export function AuthorizationResultPage() {
  const navigate = useNavigate();
  const selection = useAuthorizationSelection();
  const result = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem(resultKey) ?? 'null') as SubmissionResult | null; } catch { return null; }
  }, []);
  if (!result) return <main className="page"><h1>No hay un resultado para mostrar</h1><Link to="/autorizaciones">Volver a los eventos</Link></main>;
  return <main className="page narrow"><header className="header"><span className="wordmark">Colegio</span></header>
    <section className="welcome"><p className="eyebrow">Resultado del envío</p><h1>{result.createdCount > 0 ? 'Autorización enviada con éxito' : 'No se pudieron enviar las autorizaciones'}</h1><p>{result.createdCount} autorizadas · {result.failedCount} no autorizadas</p></section>
    {result.created.length > 0 && <section className="result-section"><h2>Autorizadas</h2><ul>{result.created.map((pair) => <li key={`${pair.eventId}:${pair.studentId}`}>{pair.studentName} — {pair.eventTitle}. Autorización registrada correctamente.</li>)}</ul></section>}
    {result.failed.length > 0 && <section className="result-section"><h2>No autorizadas</h2><ul>{result.failed.map((pair) => <li key={`${pair.eventId}:${pair.studentId}`}>{pair.studentName} — {pair.eventTitle}: {pair.message}</li>)}</ul></section>}
    <button className="button primary-button" type="button" onClick={() => { selection.clear(); navigate('/autorizaciones'); }}>Volver a los eventos</button>
  </main>;
}
