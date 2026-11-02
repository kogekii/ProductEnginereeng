import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AuthorizationSelectionProvider, useAuthorizationSelection } from '../../src/client/features/authorizations/AuthorizationSelectionProvider.js';

function Harness() {
  const selection = useAuthorizationSelection();
  return <><output aria-label="Cantidad">{selection.count}</output>
    <button onClick={() => selection.toggle({ eventId: 'event-1', studentId: 'student-1' })}>Alternar</button>
    <button onClick={() => selection.addMany([{ eventId: 'event-1', studentId: 'student-2' }])}>Agregar otro</button>
  </>;
}

afterEach(() => { cleanup(); sessionStorage.clear(); });

describe('selección de autorizaciones', () => {
  it('alterna pares sin duplicarlos y mantiene el contador derivado', () => {
    render(<AuthorizationSelectionProvider><Harness /></AuthorizationSelectionProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Alternar' }));
    expect(screen.getByLabelText('Cantidad')).toHaveTextContent('1');
    fireEvent.click(screen.getByRole('button', { name: 'Alternar' }));
    expect(screen.getByLabelText('Cantidad')).toHaveTextContent('0');
  });

  it('agrega pares distintos y restaura la selección desde sessionStorage', () => {
    const first = render(<AuthorizationSelectionProvider><Harness /></AuthorizationSelectionProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Alternar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar otro' }));
    expect(screen.getByLabelText('Cantidad')).toHaveTextContent('2');
    first.unmount();
    render(<AuthorizationSelectionProvider><Harness /></AuthorizationSelectionProvider>);
    expect(screen.getByLabelText('Cantidad')).toHaveTextContent('2');
  });
});
