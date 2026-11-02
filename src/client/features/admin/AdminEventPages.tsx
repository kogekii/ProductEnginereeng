import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { formatInSantiago } from '../../../shared/dates.js';
import { LogoutButton } from '../../components/LogoutButton.js';

interface Course { id: string; name: string }
interface EventRow { id: string; title: string; startsAt: string; status: 'PUBLISHED' | 'CLOSED'; applicableCount: number; pendingCount: number; complete: boolean }
interface PendingData {
  event: { id: string; title: string; status: 'PUBLISHED' | 'CLOSED' };
  students: Array<{ id: string; fullName: string; courseName: string; guardians: Array<{ fullName: string; email: string | null; phone: string | null }> }>;
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('No fue posible cargar la información. Intenta nuevamente.');
  return response.json() as Promise<T>;
}

export function AdminEventsPage() {
  const courses = useQuery({ queryKey: ['admin-courses'], queryFn: () => getJson<Course[]>('/api/admin/courses') });
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const query = new URLSearchParams();
  selectedCourses.forEach((id) => query.append('courseIds', id));
  const events = useQuery({
    queryKey: ['admin-events', selectedCourses],
    queryFn: () => getJson<EventRow[]>(`/api/admin/events${query.size ? `?${query.toString()}` : ''}`),
  });
  return <main className="page">
    <header className="header"><Link to="/">Volver al inicio</Link><span className="wordmark">Colegio</span><LogoutButton /></header>
    <section className="welcome"><p className="eyebrow">Panel de administración</p><h1>Eventos</h1><p>Seguimiento de autorizaciones pendientes.</p></section>
    <section className="filter-panel" aria-label="Filtrar por curso"><h2>Filtrar por curso</h2>
      {courses.isPending && <p role="status">Cargando cursos…</p>}
      {courses.isError && <p role="alert" className="error-message">{courses.error.message}</p>}
      <div className="course-filter">{courses.data?.map((course) => <label key={course.id}><input type="checkbox" checked={selectedCourses.includes(course.id)} onChange={(event) => setSelectedCourses((previous) => event.target.checked ? [...previous, course.id] : previous.filter((id) => id !== course.id))} />{course.name}</label>)}</div>
      {selectedCourses.length > 0 && <button className="link-button" type="button" onClick={() => setSelectedCourses([])}>Limpiar filtro</button>}
    </section>
    {events.isPending && <p role="status">Cargando eventos…</p>}
    {events.isError && <p role="alert" className="error-message">{events.error.message}</p>}
    {events.data?.length === 0 && <div className="empty-state"><h2>{selectedCourses.length ? 'No hay eventos para los cursos seleccionados' : 'No hay eventos en este período'}</h2><p>Los eventos publicados y cerrados aparecerán aquí.</p></div>}
    {events.data && events.data.length > 0 && <div className="event-list">{events.data.map((event) => <article className="event-card" key={event.id}>
      <p className="eyebrow">{event.status === 'CLOSED' ? 'Cerrado' : 'Publicado'}</p>
      <h2><Link to={`/admin/eventos/${event.id}`}>{event.title}</Link></h2>
      <p>{formatInSantiago(new Date(event.startsAt))}</p>
      <p>Faltan {event.pendingCount} de {event.applicableCount} autorizaciones</p>
      {event.complete && <strong className="status-chip">Completo</strong>}
    </article>)}</div>}
  </main>;
}

export function AdminEventPendingPage() {
  const { id } = useParams();
  const data = useQuery({ queryKey: ['admin-pending', id], queryFn: () => getJson<PendingData>(`/api/admin/events/${id}/pending`), enabled: Boolean(id) });
  return <main className="page">
    <header className="header"><Link to="/admin/eventos">Volver a Eventos</Link><span className="wordmark">Colegio</span><LogoutButton /></header>
    {data.isPending && <p role="status">Cargando estudiantes pendientes…</p>}
    {data.isError && <p role="alert" className="error-message">{data.error.message}</p>}
    {data.data && <>
      <section className="welcome"><p className="eyebrow">{data.data.event.status === 'CLOSED' ? 'Evento cerrado' : 'Evento publicado'}</p><h1>{data.data.event.title}</h1><p>Estudiantes que todavía no tienen una autorización vigente.</p></section>
      {data.data.students.length === 0 ? <div className="empty-state"><h2>Todas las autorizaciones están firmadas</h2></div> : <div className="event-list">{data.data.students.map((student) => <article className="event-card" key={student.id}>
        <h2>{student.fullName}</h2><p>Curso: {student.courseName}</p>
        <h3>Apoderados</h3>
        {student.guardians.map((guardian, index) => <p key={`${student.id}:${index}`}>{guardian.fullName}<br />{guardian.email && <span>Correo: {guardian.email}</span>}{guardian.email && guardian.phone ? ' · ' : ''}{guardian.phone && <span>Teléfono: {guardian.phone}</span>}</p>)}
      </article>)}</div>}
    </>}
  </main>;
}
