import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../../src/client/routes/App.js';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function renderApp() {
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}><BrowserRouter><App /></BrowserRouter></QueryClientProvider>);
}

describe('acceso en modo demostración', () => {
  it('muestra las cuentas de prueba solo cuando el modo demo está activo', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => Promise.resolve(
      String(input).endsWith('/api/auth/config')
        ? Response.json({ demoMode: true })
        : Response.json({ code: 'AUTH_REQUIRED' }, { status: 401 }),
    )));
    renderApp();
    expect(await screen.findByRole('heading', { name: 'Cuentas de demostración' })).toBeInTheDocument();
    expect(screen.getByText(/apoderado1@colegio\.example/)).toBeInTheDocument();
  });

  it('no muestra las cuentas de prueba cuando el modo demo está desactivado', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => Promise.resolve(
      String(input).endsWith('/api/auth/config')
        ? Response.json({ demoMode: false })
        : Response.json({ code: 'AUTH_REQUIRED' }, { status: 401 }),
    )));
    renderApp();
    expect(await screen.findByRole('heading', { name: 'Ingresa a tu cuenta' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Cuentas de demostración' })).not.toBeInTheDocument();
  });
});
