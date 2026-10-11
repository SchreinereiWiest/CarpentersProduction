import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

const authState = vi.hoisted(() => ({
  user: null,
  loading: false,
}));

vi.mock('../../src/routes/AuthContext.jsx', () => ({
  useAuth: () => authState,
}));

import ProtectedRoute from '../../src/routes/ProtectedRoute.jsx';

function renderProtectedPage({ path, requiredRole, label }) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div>Startseite</div>} />
        <Route path="/login" element={<div>Anmeldung</div>} />
        <Route
          path={path}
          element={(
            <ProtectedRoute requiredRole={requiredRole}>
              <div>{label}</div>
            </ProtectedRoute>
          )}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Zugriff auf die Projektanlage', () => {
  it.each(['user', 'manager', 'admin'])(
    'erlaubt einem angemeldeten Benutzer mit Rolle %s die Projektanlage',
    (role) => {
      authState.user = { id: `${role}-id`, role };
      authState.loading = false;

      renderProtectedPage({
        path: '/Projects/Create',
        requiredRole: 'user',
        label: 'Projekt anlegen',
      });

      expect(screen.getByText('Projekt anlegen')).toBeInTheDocument();
    },
  );

  it('leitet einen nicht angemeldeten Besucher zur Anmeldung um', () => {
    authState.user = null;
    authState.loading = false;

    renderProtectedPage({
      path: '/Projects/Create',
      requiredRole: 'user',
      label: 'Projekt anlegen',
    });

    expect(screen.getByText('Anmeldung')).toBeInTheDocument();
  });

});

describe('Manager- und Adminprivilegien', () => {
  it.each(['manager', 'admin'])(
    'erlaubt der Rolle %s eine administrative Seite',
    (role) => {
      authState.user = { id: `${role}-id`, role };

      renderProtectedPage({
        path: '/Kontakte',
        requiredRole: 'admin',
        label: 'Kundenverwaltung',
      });

      expect(screen.getByText('Kundenverwaltung')).toBeInTheDocument();
    },
  );

  it('verweigert einem normalen Benutzer administrative Seiten', () => {
    authState.user = { id: 'user-id', role: 'user' };

    renderProtectedPage({
      path: '/Kontakte',
      requiredRole: 'admin',
      label: 'Kundenverwaltung',
    });

    expect(screen.getByText('Startseite')).toBeInTheDocument();
  });

  it('erlaubt ausschließlich dem Admin die Firmeneinstellungen', () => {
    authState.user = { id: 'admin-id', role: 'admin' };

    renderProtectedPage({
      path: '/CompanySettings',
      requiredRole: 'adminOnly',
      label: 'Firmeneinstellungen',
    });

    expect(screen.getByText('Firmeneinstellungen')).toBeInTheDocument();
  });

  it.each(['manager', 'user'])(
    'verweigert der Rolle %s die Firmeneinstellungen',
    (role) => {
      authState.user = { id: `${role}-id`, role };

      renderProtectedPage({
        path: '/CompanySettings',
        requiredRole: 'adminOnly',
        label: 'Firmeneinstellungen',
      });

      expect(screen.getByText('Startseite')).toBeInTheDocument();
    },
  );
});
