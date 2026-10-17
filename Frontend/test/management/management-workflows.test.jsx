import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultConfig } from '@Engine/management/defaults/config.defaults.mjs';
import { today } from '@Engine/management/utils/dates.mjs';
import { approvedConfig } from '@Engine/management/config/approval.mjs';
import { calculateSetup } from '@Engine/management/calculation/accounting.mjs';
import { prepareSetupConfig } from '@Engine/management/config/normalize.mjs';

const mocks = vi.hoisted(() => ({ request: vi.fn(), get: vi.fn() }));
vi.mock('axios', () => ({ default: Object.assign(mocks.request, { get: mocks.get }) }));
vi.mock('../../src/shared/components/sideBar.jsx', () => ({ default: ({ selected }) => <div data-testid="sidebar">{selected}</div> }));
vi.mock('../../src/shared/settings/company-settings.js', async importOriginal => {
  const original = await importOriginal(); return { ...original, loadCompanySettings: vi.fn(async () => original.DEFAULT_COMPANY_SETTINGS) };
});
import ManagementLayout from '../../src/features/management/layout/managementLayout.jsx';
import ManagementOverview from '../../src/features/management/operating/overview.jsx';
import ManagementSetup from '../../src/features/management/setup/setup.jsx';
import ManagementHours from '../../src/features/management/operating/hours.jsx';
import ManagementOperatingCosts from '../../src/features/management/operating/operatingCosts.jsx';

let saved;
function publish() {
  const config = structuredClone(saved.config); config.setup.approvals = [];
  const calculation = calculateSetup(config, { year: saved.year, timeEntries: saved.timeEntries });
  saved.config.setup.approvals.push({ version: saved.config.setup.approvals.length + 1, approvedAt: today(), note: '', config, calculation, rates: calculation.rates, totalCosts: calculation.totalCosts });
}
function snapshot() {
  const state = structuredClone(saved); const operational = structuredClone(approvedConfig(state.config) || state.config);
  for (const cost of operational.setup.annualCosts) cost.actualAmount = state.config.setup.annualCosts.find(item => item.id === cost.id)?.actualAmount ?? null;
  return { ...state, setupCalculation: calculateSetup(state.config, { year: state.year, timeEntries: state.timeEntries }), operationalConfig: operational,
    operatingPlan: state.config.setup.approvals.at(-1)?.calculation || calculateSetup(operational, { year: state.year, timeEntries: state.timeEntries }), operatingActual: calculateSetup(operational, { year: state.year, timeEntries: state.timeEntries, basis: 'actual' }), previous: null };
}
beforeEach(() => {
  const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto); vi.stubGlobal('crypto', { getRandomValues });
  saved = { year: Number(today().slice(0, 4)), revision: 0, config: prepareSetupConfig({ config: defaultConfig(), revision: 0 }), transactions: [], assets: [], loans: [], timeEntries: [] };
  mocks.get.mockImplementation(async () => ({ data: {
    ...snapshot(),
    references: { projects: [], files: [], employees: [{ id: '00000000-0000-0000-0000-000000000001', firstName: 'Anna', lastName: 'Holz', login: 'anna' }] }
  } }));
  mocks.request.mockImplementation(async ({ url, data }) => {
    if (url.endsWith('/settings')) { const history = saved.config.setup.approvals; saved.config = structuredClone(data.config); saved.config.setup.approvals = history; saved.revision++; }
    if (url.endsWith('/setup/approve')) { publish(); saved.revision++; }
    return { data: { success: true } };
  });
});
function open(path) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/Management" element={<ManagementLayout/>}><Route index element={<ManagementOverview/>}/><Route path="Setup/:step" element={<ManagementSetup/>}/><Route path="Hours" element={<ManagementHours/>}/><Route path="Costs" element={<ManagementOperatingCosts/>}/></Route></Routes></MemoryRouter>);
}
function ready() {
  saved.revision = 1; saved.config.mode = 'full'; saved.config.setup.companyName = 'Schreinerei Holz';
  saved.config.costCenters = [{ id: 'workshop', name: 'Werkstatt', kind: 'production', hours: 1000, area: 100, employees: 1, directBase: 0, redistributionKey: 'hours', activityIds: ['cutting', 'edging'], consumption: 0, usage: 0 }];
  saved.config.setup.annualCosts = [{ id: 'rent', name: 'Miete', costTypeId: 'space', amount: 12000, actualAmount: null, centerId: 'workshop', keyId: 'area', source: 'manual' }];
}
describe('Management-Einrichtung und Jahresbetrieb', () => {
  it('führt einen neuen Betrieb in acht Einrichtungsschritte ohne Geschäftsvorfälle', async () => {
    open('/Management');
    expect(await screen.findByRole('heading', { name: 'Betrieb & Geschäftsjahr' })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Betrieb einrichten' })).getAllByRole('link')).toHaveLength(8);
    expect(screen.queryByText('Belege & Geschäftsvorfälle')).not.toBeInTheDocument(); expect(screen.getByTestId('sidebar')).toHaveTextContent('1');
    expect(screen.getByLabelText('Umfang der Einrichtung')).toHaveValue('full');
    expect(mocks.get.mock.calls.some(([url]) => url.endsWith('/references'))).toBe(false);
  });
  it('behält ungespeicherte Eingaben beim Schrittwechsel und speichert vor Weiter', async () => {
    open('/Management'); fireEvent.change(await screen.findByLabelText('Betriebsname'), { target: { value: 'Schreinerei Holz' } });
    fireEvent.click(screen.getByRole('button', { name: 'Betriebsbereiche vorschlagen' })); fireEvent.click(screen.getByRole('link', { name: /02.*Vermögen/ }));
    expect(await screen.findByRole('button', { name: '+ Anlagegut' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: /01.*Betrieb/ })); expect(await screen.findByLabelText('Betriebsname')).toHaveValue('Schreinerei Holz');
    fireEvent.click(screen.getByRole('button', { name: 'Speichern & Weiter' }));
    await waitFor(() => expect(saved.config.costCenters).toHaveLength(5)); expect(saved.config.setup.companyName).toBe('Schreinerei Holz');
    expect(saved.config.costCenters.find(center => center.id === 'machines').activityIds).toEqual(['cutting', 'edging']);
  });
  it('übernimmt Personal und berechnet Tagesstunden aus Firmeneinstellungen', async () => {
    ready(); open('/Management/Setup/Hours'); fireEvent.click(await screen.findByRole('button', { name: 'Vorhandenes Personal übernehmen' }));
    expect(screen.getByLabelText('Mitarbeitername')).toHaveValue('Anna Holz'); expect(screen.getByLabelText('Arbeitsstunden pro Tag')).toHaveValue(8.75);
    fireEvent.change(screen.getByLabelText('Produktive Jahresstunden manuell'), { target: { value: '1200' } }); fireEvent.click(screen.getByRole('button', { name: 'Entwurf speichern' }));
    await waitFor(() => expect(saved.config.setup.staff[0].annualHours).toBe(1200)); expect(saved.config.setup.staff[0].userId).toBe('00000000-0000-0000-0000-000000000001');
  });
  it('berechnet die CNC live mit 26 €/h', async () => {
    ready(); saved.config.setup.assets = [{ id: 'cnc', name: 'CNC', category: 'cnc', acquiredAt: `${saved.year}-01-01`, purchaseCost: 120000, replacementCost: 0, useReplacement: false, residualValue: 20000, usefulLifeYears: 10, usedYears: 0, centerId: 'workshop', loanId: null, maintenance: 5000, energy: 6000, space: 3000, operating: 0, hours: 1000, activityIds: [], interestRate: 3, interestAmount: 2000 }];
    open('/Management/Setup/Machines'); expect(await screen.findByText('26,00 € / h')).toBeInTheDocument(); expect(screen.getByText('26.000,00 €')).toBeInTheDocument();
  });
  it('schaltet nach Freigabe zur Jahresbar und kann die Einrichtung wieder öffnen', async () => {
    ready(); open('/Management/Setup/Review'); fireEvent.click(await screen.findByRole('button', { name: 'Freigeben & Jahresansicht öffnen' }));
    expect(await screen.findByRole('heading', { name: 'Betriebsübersicht' })).toBeInTheDocument(); expect(within(screen.getByRole('navigation', { name: 'Managementbereiche' })).getAllByRole('link')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Betrieb konfigurieren' })); expect(await screen.findByRole('heading', { name: 'Betrieb & Geschäftsjahr' })).toBeInTheDocument(); expect(saved.config.setup.approvals).toHaveLength(1);
  });
  it('lässt eine unvollständige Vollkalkulation nicht freigeben', async () => {
    open('/Management/Setup/Review'); expect(await screen.findByRole('button', { name: 'Freigeben & Jahresansicht öffnen' })).toBeDisabled(); expect(screen.getByText('Betriebsname fehlt.')).toBeInTheDocument();
  });
  it('erlaubt Easy-Freigabe ohne Anlagen, Personal und Kostenstellen', async () => {
    saved.revision = 1; saved.config.mode = 'easy'; saved.config.setup.companyName = 'Kleiner Betrieb'; open('/Management/Setup/Bab');
    fireEvent.click(await screen.findByRole('button', { name: '+ Stundensatz' })); fireEvent.change(screen.getByLabelText('Selbstkosten (€ / h)'), { target: { value: '50' } }); fireEvent.click(screen.getByRole('button', { name: 'Speichern & Weiter' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Freigeben & Jahresansicht öffnen' })); expect(await screen.findByRole('heading', { name: 'Betriebsübersicht' })).toBeInTheDocument(); expect(screen.getByText('50,00 €')).toBeInTheDocument(); expect(saved.config.setup.assets).toEqual([]);
  });
  it('schlüsselt Kalenderzeiten auf gebündelte Tätigkeiten und Mitarbeiter auf', async () => {
    ready(); publish(); saved.timeEntries = [
      { id: 'one', userId: 'anna', user: { firstName: 'Anna', lastName: 'Holz' }, workType: 'cutting', duration: 60, startedAt: `${saved.year}-01-01T08:00:00Z`, endedAt: `${saved.year}-01-01T09:00:00Z` },
      { id: 'two', userId: 'anna', user: { firstName: 'Anna', lastName: 'Holz' }, workType: 'edging', duration: 30, startedAt: `${saved.year}-01-01T09:00:00Z`, endedAt: `${saved.year}-01-01T09:30:00Z` },
    ]; open('/Management/Hours'); expect(await screen.findByText('Anna Holz')).toBeInTheDocument(); expect(screen.getByText('Zuschnitt')).toBeInTheDocument(); expect(screen.getByText('Bekantung')).toBeInTheDocument(); expect(screen.getAllByText('1,5 h').length).toBeGreaterThan(0);
  });
  it('erfasst Anlagen und bestehende Restschulden ohne neue Geschäftsvorfälle', async () => {
    ready(); open('/Management/Setup/Assets'); fireEvent.click(await screen.findByRole('button', { name: '+ Anlagegut' }));
    fireEvent.change(screen.getByLabelText('Anlagegut'), { target: { value: 'CNC Neu' } });
    fireEvent.change(screen.getByLabelText('Anschaffungswert (€)'), { target: { value: '120000' } });
    fireEvent.change(screen.getByLabelText('Restwert (€)'), { target: { value: '20000' } });
    fireEvent.change(screen.getByLabelText('Zugeordnete Kostenstelle'), { target: { value: 'workshop' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Darlehen' }));
    fireEvent.change(screen.getByLabelText('Restschuld zu Jahresbeginn (€)'), { target: { value: '140000' } });
    fireEvent.change(screen.getByLabelText('Bankguthaben / Kasse (€)'), { target: { value: '35000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entwurf speichern' }));
    await waitFor(() => expect(saved.config.setup.assets[0].purchaseCost).toBe(120000)); expect(saved.config.setup.loans[0].balance).toBe(140000); expect(saved.transactions).toEqual([]);
    expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({ url: '/api/management/settings' }));
  });
  it('prüft einen CSV-Import und übernimmt ihn erst nach ausdrücklicher Auswahl in den Entwurf', async () => {
    open('/Management'); const input = await screen.findByLabelText('CSV-Datei auswählen');
    const file = new File(['bereich;position;wert\nbilanz;Bankguthaben;35.000,00'], 'bilanz.csv', { type: 'text/csv' });
    file.text = async () => 'bereich;position;wert\nbilanz;Bankguthaben;35.000,00';
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(await screen.findByRole('button', { name: 'In Entwurf übernehmen' }));
    expect(saved.config.openingCash).toBe(0); expect(mocks.request).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Entwurf speichern' })); await waitFor(() => expect(saved.config.openingCash).toBe(35000));
  });
  it('speichert nur die Ist-Summe und erhält veröffentlichte Jahrespläne', async () => {
    ready(); publish(); open('/Management/Costs'); fireEvent.change(await screen.findByLabelText('Miete · Ist-Summe (€)'), { target: { value: '3000' } }); fireEvent.click(screen.getByRole('button', { name: 'Ist-Summen speichern' }));
    await waitFor(() => expect(saved.config.setup.annualCosts[0].actualAmount).toBe(3000)); expect(saved.config.setup.approvals[0].totalCosts).toBe(12000); expect(saved.config.setup.annualCosts[0].amount).toBe(12000);
  });
});
