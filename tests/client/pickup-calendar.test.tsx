import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../src/client/features/auth/AuthProvider.js';
import { AuthorizationSelectionProvider } from '../../src/client/features/authorizations/AuthorizationSelectionProvider.js';
import { GuardianPickupCalendarPage } from '../../src/client/features/pickups/GuardianPickupPages.js';
import { PickupSelectionProvider } from '../../src/client/features/pickups/PickupSelectionProvider.js';

const students = [
  { id: '30000000-0000-4000-8000-000000000001', fullName: 'Martina Ejemplo', courseName: '1° básico A' },
  { id: '30000000-0000-4000-8000-000000000002', fullName: 'Tomás Ejemplo', courseName: '2° básico A' },
];

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('calendario y selección de retiros', () => {
  it('inicia cada fecha con todos los estudiantes y conserva la selección al cambiar de mes', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/auth/config')) return Promise.resolve(Response.json({ demoMode: true }));
      if (url.endsWith('/api/auth/me')) return Promise.resolve(Response.json({ user: { id: 'guardian', firstName: 'Camila', isAdmin: false }, demoMode: true }));
      if (url.endsWith('/api/guardian/pickups/context')) return Promise.resolve(Response.json({
        today: '2026-11-04', currentMonth: '2026-11', nextMonth: '2026-12',
        eligibleDates: ['2026-11-05', '2026-11-06', '2026-12-03'], students,
      }));
      throw new Error(`Solicitud inesperada: ${url}`);
    }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><BrowserRouter><AuthProvider><AuthorizationSelectionProvider><PickupSelectionProvider><GuardianPickupCalendarPage /></PickupSelectionProvider></AuthorizationSelectionProvider></AuthProvider></BrowserRouter></QueryClientProvider>);

    expect(await screen.findByRole('heading', { name: '¿Qué días retirarán a tus estudiantes?' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Martina Ejemplo/)).toBeChecked();
    expect(screen.getByLabelText(/Tomás Ejemplo/)).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: /jueves, 5 de noviembre/ }));
    expect(await screen.findByText('Martina Ejemplo, Tomás Ejemplo')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar mes siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: /jueves, 3 de diciembre/ }));
    expect(screen.getByText('Días seleccionados: 2')).toBeInTheDocument();
    expect(screen.getAllByText('Martina Ejemplo, Tomás Ejemplo')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar estudiantes por día' }));
    const dayGroup = screen.getByRole('group', { name: /jueves, 3 de diciembre/ });
    const secondStudent = within(dayGroup).getByLabelText(/Tomás Ejemplo/);
    fireEvent.click(secondStudent);
    expect(secondStudent).not.toBeChecked();
    expect(screen.getByText('Selección distinta')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled());
    client.clear();
  });
});
