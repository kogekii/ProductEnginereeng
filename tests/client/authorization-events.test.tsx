import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthorizationEventsPage } from '../../src/client/features/authorizations/AuthorizationPages.js';
import { AuthorizationSelectionProvider } from '../../src/client/features/authorizations/AuthorizationSelectionProvider.js';

const events = [{
  id: 'event-1', title: 'Salida escolar', startsAt: '2026-11-20T15:00:00.000Z', endsAt: '2026-11-20T16:00:00.000Z',
  deadlineAt: '2026-11-18T15:00:00.000Z', purpose: 'Visita educativa', allAuthorized: false,
  students: [
    { id: 'student-1', fullName: 'Estudiante Vinculado', alreadyAuthorized: false },
    { id: 'student-2', fullName: 'Estudiante Ya Firmado', alreadyAuthorized: true },
  ],
}];

afterEach(() => { cleanup(); vi.restoreAllMocks(); sessionStorage.clear(); });

describe('lista de autorizaciones', () => {
  it('muestra los estados y selecciona solo estudiantes pendientes', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(Response.json(events))));
    render(<BrowserRouter><AuthorizationSelectionProvider><AuthorizationEventsPage /></AuthorizationSelectionProvider></BrowserRouter>);
    expect(await screen.findByRole('heading', { name: 'Salida escolar' })).toBeInTheDocument();
    expect(screen.getByText('Ya autorizada')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Estudiante Ya Firmado/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar todos' }));
    expect(screen.getByText('1 autorizaciones seleccionadas')).toBeInTheDocument();
  });
});
