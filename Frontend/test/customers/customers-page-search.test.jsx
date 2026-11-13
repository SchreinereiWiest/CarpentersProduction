import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('axios', () => ({ default: { get: mocks.get } }));
vi.mock('../../src/shared/components/sideBar.jsx', () => ({
  default: () => <div data-testid="sidebar" />,
}));

import CustomersPage from '../../src/features/customers/pages/CustomersPage.jsx';

const customer = (overrides = {}) => ({
  id: 'customer-1',
  firstName: 'Anna',
  lastName: 'Muster',
  email: 'anna@example.com',
  phoneMobile: '01234',
  customerStatus: 'active',
  addresses: [{ city: 'Stuttgart' }],
  ...overrides,
});

describe('CustomersPage-Suche', () => {
  beforeEach(() => {
    mocks.get.mockImplementation(async (url) => {
      if (url === '/api/customers/all?page=1') {
        return {
          data: {
            customers: [customer()],
            totalPages: 1,
          },
        };
      }

      if (url === '/api/customers/search?search=Beispiel%20GmbH&includeDisplayStatus=true') {
        return {
          data: [customer({
            id: 'customer-2',
            firstName: 'Berta',
            lastName: 'Beispiel',
            companyName: 'Beispiel GmbH',
            addresses: undefined,
          })],
        };
      }

      throw new Error(`Unerwarteter Request: ${url}`);
    });
  });

  it('zeigt die Treffer des Suchendpoints in der Kundentabelle an', async () => {
    render(<MemoryRouter><CustomersPage /></MemoryRouter>);

    expect(await screen.findByText('Anna Muster')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Kunden suchen' }), {
      target: { value: '  Beispiel GmbH  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Suchen' }));

    expect(await screen.findByText('Berta Beispiel')).toBeInTheDocument();
    expect(screen.queryByText('Anna Muster')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.get).toHaveBeenCalledWith(
        '/api/customers/search?search=Beispiel%20GmbH&includeDisplayStatus=true'
      );
    });
  });
});
