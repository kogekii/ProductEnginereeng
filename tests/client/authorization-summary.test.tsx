import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthorizationEventsPage, AuthorizationSummaryPage } from '../../src/client/features/authorizations/AuthorizationPages.js';
import { AuthorizationSelectionProvider, useAuthorizationSelection } from '../../src/client/features/authorizations/AuthorizationSelectionProvider.js';

const events = [
  { id: 'event-1', title: 'Salida escolar', startsAt: '2026-11-20T15:00:00Z', endsAt: '2026-11-20T16:00:00Z', deadlineAt: '2026-11-18T15:00:00Z', purpose: 'Visita educativa', allAuthorized: false, students: [{ id: 'student-1', fullName: 'Ana Ejemplo', alreadyAuthorized: false }] },
  { id: 'event-2', title: 'Jornada deportiva', startsAt: '2026-12-01T15:00:00Z', endsAt: '2026-12-01T16:00:00Z', deadlineAt: '2026-11-29T15:00:00Z', purpose: 'Actividad física', allAuthorized: false, students: [{ id: 'student-2', fullName: 'Benjamín Ejemplo', alreadyAuthorized: false }] },
];

function SeedSelection() {
  const selection = useAuthorizationSelection();
  const navigate = useNavigate();
  useEffect(() => {
    selection.selectMany([{ eventId: 'event-1', studentId: 'student-1' }]);
    navigate('/autorizaciones/resumen', { replace: true });
  }, []);
  return null;
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); sessionStorage.clear(); });

describe('resumen obligatorio', () => {
  it('conserva la selección al volver y actualiza el resumen antes de confirmar', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(Response.json(events))));
    render(<MemoryRouter initialEntries={['/seed']}><AuthorizationSelectionProvider><Routes>
      <Route path="/seed" element={<SeedSelection />} />
      <Route path="/autorizaciones" element={<AuthorizationEventsPage />} />
      <Route path="/autorizaciones/resumen" element={<AuthorizationSummaryPage />} />
    </Routes></AuthorizationSelectionProvider></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Revisa antes de firmar' })).toBeInTheDocument();
    expect(screen.getByText('Ana Ejemplo')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar autorización' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Volver a la selección' }));
    fireEvent.click(await screen.findByLabelText('Benjamín Ejemplo'));
    expect(screen.getByText('2 autorizaciones seleccionadas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar al resumen' }));
    expect(await screen.findByText('Benjamín Ejemplo')).toBeInTheDocument();
  });
});
