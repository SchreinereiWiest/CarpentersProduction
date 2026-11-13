import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('axios', () => ({ default: { post: mocks.post } }));
vi.mock('../../src/shared/components/sideBar.jsx', () => ({
  default: () => <div data-testid="sidebar" />,
}));

import NewCustomerPage from '../../src/features/customers/pages/NewCustomerPage.jsx';

describe('Neuen Kunden anlegen', () => {
  beforeEach(() => {
    mocks.post.mockResolvedValue({ data: { id: 'customer-1' } });
  });

  it('zeigt kein Statusfeld und sendet keinen manuell gesetzten Kundenstatus', async () => {
    render(
      <MemoryRouter initialEntries={['/Kontakte/new']}>
        <Routes>
          <Route path="/Kontakte/new" element={<NewCustomerPage />} />
          <Route path="/kontakte" element={<div>Kundenliste</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByPlaceholderText('Customer Status')).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('First Name'), {
      target: { value: 'Anna' },
    });
    fireEvent.change(screen.getByPlaceholderText('Last Name'), {
      target: { value: 'Muster' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));
    const [, requestBody] = mocks.post.mock.calls[0];
    expect(requestBody).not.toHaveProperty('customerStatus');
    expect(await screen.findByText('Kundenliste')).toBeInTheDocument();
  });
});
