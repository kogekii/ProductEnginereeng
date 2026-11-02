import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AdminEventsPage } from '../../src/client/features/admin/AdminEventPages.js';
import { AuthProvider } from '../../src/client/features/auth/AuthProvider.js';
import { AuthorizationSelectionProvider } from '../../src/client/features/authorizations/AuthorizationSelectionProvider.js';

const courses = [{ id: 'course-1', name: '1° básico A' }, { id: 'course-2', name: '2° básico A' }];
const events = [
  { id: 'event-1', title: 'Salida pedagógica', startsAt: '2026-11-20T15:00:00Z', status: 'PUBLISHED', applicableCount: 10, pendingCount: 3, complete: false },
  { id: 'event-2', title: 'Jornada deportiva', startsAt: '2026-12-20T15:00:00Z', status: 'CLOSED', applicableCount: 4, pendingCount: 0, complete: true },
];

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('seguimiento de eventos del administrador', () => {
  it('muestra contadores y actualiza los eventos al filtrar por curso', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/admin/courses')) return Promise.resolve(Response.json(courses));
      return Promise.resolve(Response.json(url.includes('courseIds=course-2') ? [events[1]] : events));
    }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><BrowserRouter><AuthProvider><AuthorizationSelectionProvider><AdminEventsPage /></AuthorizationSelectionProvider></AuthProvider></BrowserRouter></QueryClientProvider>);
    expect(await screen.findByRole('heading', { name: 'Salida pedagógica' })).toBeInTheDocument();
    expect(screen.getByText('Faltan 3 de 10 autorizaciones')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('2° básico A'));
    expect(await screen.findByRole('heading', { name: 'Jornada deportiva' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Salida pedagógica' })).not.toBeInTheDocument();
    client.clear();
  });
});
