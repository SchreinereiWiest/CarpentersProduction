import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateManagement, defaultConfig, today } from '../../../shared/management.mjs';

const mocks = vi.hoisted(() => ({ request: vi.fn(), get: vi.fn(), post: vi.fn() }));
vi.mock('axios', () => ({ default: Object.assign(mocks.request, { get: mocks.get, post: mocks.post }) }));
vi.mock('../../src/components/sideBar.jsx', () => ({ default: ({ selected }) => <div data-testid="sidebar">{selected}</div> }));
import ManagementLayout from '../../src/pages/management/managementLayout.jsx';
import ManagementOverview from '../../src/pages/management/overview.management.jsx';
import ManagementTransactions from '../../src/pages/management/transactions.management.jsx';
import ManagementCostAccounting from '../../src/pages/management/costAccounting.management.jsx';
import ManagementCalculation from '../../src/pages/management/calculation.management.jsx';
import ManagementSettings from '../../src/pages/management/settings.management.jsx';

let saved;
beforeEach(() => {
  // HTTP über die LAN-Adresse: randomUUID ist dort nicht verfügbar.
  const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
  vi.stubGlobal('crypto', { getRandomValues });
  saved = { year: Number(today().slice(0, 4)), revision: 0, config: defaultConfig(), transactions: [], assets: [], loans: [] };
  mocks.get.mockImplementation(async (url, options) => ({ data: url.endsWith('/references') ? { projects: [], files: [] } : { ...structuredClone(saved), calculation: calculateManagement(saved, { year: options.params.year, basis: options.params.basis || 'actual' }) } }));
  mocks.request.mockImplementation(async ({ url, data }) => {
    if (url.endsWith('/settings')) { saved.config = structuredClone(data.config); saved.revision++; }
    if (/\/transactions\/.+\/payments$/.test(url)) { saved.transactions[0].payments.push({ id: 'payment-1', amount: Number(data.amount), date: data.date }); }
    return { data: { success: true } };
  });
});
function open(path) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/Management" element={<ManagementLayout/>}><Route index element={<ManagementOverview/>}/><Route path="Transactions" element={<ManagementTransactions/>}/><Route path="CostAccounting" element={<ManagementCostAccounting/>}/><Route path="Calculation" element={<ManagementCalculation/>}/><Route path="Settings" element={<ManagementSettings/>}/></Route></Routes></MemoryRouter>);
}

describe('Management-Arbeitsabläufe', () => {
  it('öffnet die Betriebsübersicht mit sechs beschrifteten Bereichen und leeren Anfangswerten', async () => {
    open('/Management');
    expect(await screen.findByRole('heading', { name: 'Betriebsübersicht' })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Managementbereiche' })).getAllByRole('link')).toHaveLength(6);
    expect(screen.getByTestId('sidebar')).toHaveTextContent('1');
    expect(screen.getByText('Mit wenigen Angaben starten')).toBeInTheDocument();
    expect(screen.getByText('Alle erfassten Rechnungen sind ausgeglichen.')).toBeInTheDocument();
  });

  it('speichert einen Easy-Stundensatz dauerhaft und verwendet ihn in der Preisvorschau', async () => {
    open('/Management/Calculation');
    fireEvent.click(await screen.findByRole('button', { name: '+ Stundensatz' }));
    fireEvent.change(screen.getByLabelText('Leistungsbereich'), { target: { value: 'Werkstatt' } });
    fireEvent.change(screen.getByLabelText('Stundensatz ohne Gewinn (€ netto / h)'), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText('Werkstatt · Stunden'), { target: { value: '2' } });
    expect(screen.getByText('110,00 €')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Stundensätze speichern' }));
    await waitFor(() => expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({ method: 'put', url: '/api/management/settings', data: expect.objectContaining({ config: expect.objectContaining({ easyRates: [expect.objectContaining({ name: 'Werkstatt', rate: 50 })] }) }) })));
    expect(await screen.findByRole('status')).toHaveTextContent('Betriebsmodell gespeichert');
    expect(screen.getByLabelText('Stundensatz ohne Gewinn (€ netto / h)')).toHaveValue(50);
  });

  it('ermittelt Kostenstellen interaktiv und übernimmt Bezugsgrößen in das Betriebsmodell', async () => {
    saved.config.mode = 'full';
    open('/Management/CostAccounting');
    fireEvent.click(await screen.findByRole('button', { name: '2 · Kostenstellen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ausgewählte Bereiche ergänzen' }));
    expect(screen.getAllByLabelText('Bezeichnung')).toHaveLength(4);
    fireEvent.change(screen.getByLabelText('Produktive Maschinenstunden / Jahr'), { target: { value: '1200' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Modell speichern' })[0]);
    await waitFor(() => expect(saved.config.costCenters).toHaveLength(4));
    expect(saved.config.costCenters.find(center => center.kind === 'machine').hours).toBe(1200);
    expect(saved.config.costCenters.find(center => center.name === 'Verwaltung').kind).toBe('support');
  });

  it('rechnet BAB-Ergänzungen live und kennzeichnet sie bis zur Speicherung als Vorschau', async () => {
    saved.config.mode = 'full';
    saved.config.costCenters = [{ id: 'workshop', name: 'Werkstatt', kind: 'production', hours: 1000, area: 100, employees: 1, directBase: 1000, redistributionKey: 'hours' }];
    open('/Management/CostAccounting');
    fireEvent.click(await screen.findByRole('button', { name: 'BAB ergänzen' }));
    fireEvent.change(screen.getByLabelText('Kalkulatorische Kosten · Werkstatt · Ergänzung'), { target: { value: '1000' } });
    expect(screen.getByText(/Ungespeicherte Vorschau:/)).toBeInTheDocument();
    expect(screen.getByText('1,00 € / h')).toBeInTheDocument();
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it('ermittelt produktive Jahresstunden aus Kapazität und übernimmt sie erst in die Vorschau', async () => {
    saved.config.mode = 'full';
    saved.config.costCenters = [{ id: 'workshop', name: 'Werkstatt', kind: 'production', hours: 0, area: 100, employees: 1, directBase: 0, redistributionKey: 'hours' }];
    open('/Management/CostAccounting');
    fireEvent.click(await screen.findByRole('button', { name: '2 · Kostenstellen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Jahresstunden gemeinsam ermitteln' }));
    const modal = screen.getByRole('dialog', { name: 'Jahresstunden ermitteln · Werkstatt' });
    fireEvent.change(within(modal).getByLabelText('Mitarbeitende (Vollzeitäquivalente)'), { target: { value: '2' } });
    expect(within(modal).getByText('2.352 produktive Stunden / Jahr')).toBeInTheDocument();
    fireEvent.click(within(modal).getByRole('button', { name: 'In Vorschau übernehmen' }));
    expect(screen.getByLabelText('Produktive Stunden / Jahr')).toHaveValue(2352);
    expect(saved.config.costCenters[0].hours).toBe(0);
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it('erfasst eine Teilzahlung am Geschäftsvorfall und zeigt den verbleibenden offenen Betrag', async () => {
    saved.transactions = [{ id: 'invoice-1', kind: 'expense', basis: 'actual', title: 'Miete Werkstatt', source: 'manual', amount: 100, vatRate: 19, date: `${saved.year}-01-01`, payments: [], costTypeId: 'space', version: 0 }];
    open('/Management/Transactions');
    fireEvent.click(await screen.findByRole('button', { name: 'Zahlungen' }));
    const modal = screen.getByRole('dialog', { name: 'Zahlungen · Miete Werkstatt' });
    fireEvent.change(within(modal).getByLabelText('Zahlbetrag (€)'), { target: { value: '50' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Zahlung erfassen' }));
    expect(await screen.findByText('69,00 € offen')).toBeInTheDocument();
    expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({ url: '/api/management/transactions/invoice-1/payments', data: expect.objectContaining({ amount: '50' }) }));
  });

  it('ermöglicht den optionalen Wechsel zwischen Easy und Vollkalkulation', async () => {
    open('/Management/Settings');
    const mode = await screen.findByRole('radio', { name: /Umfangreich/ });
    fireEvent.click(mode);
    fireEvent.click(screen.getAllByRole('button', { name: 'Einstellungen speichern' })[0]);
    await waitFor(() => expect(saved.config.mode).toBe('full'));
    expect(saved.transactions).toEqual([]);
  });
});
