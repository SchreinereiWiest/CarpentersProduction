import test from 'node:test';
import assert from 'node:assert/strict';

// Nur eine ausdrücklich konfigurierte lokale Wegwerf-Datenbank darf zurückgesetzt werden.
const testUrl = process.env.MANAGEMENT_TEST_DATABASE_URL;
if (!testUrl) {
  test('Management-API benötigt isolierte Testdatenbank', { skip: 'MANAGEMENT_TEST_DATABASE_URL fehlt' }, () => {});
} else {
  const url = new URL(testUrl);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname) && url.pathname === '/management_test');
  process.env.DATABASE_URL = testUrl;
  process.env.JWT_ACCESS_SECRET = 'management-api-tests-local-only';
  const [{ default: express }, { default: cookieParser }, { default: jwt }, { default: prisma }, { default: router }, { defaultConfig }, { prepareSetupConfig }] = await Promise.all([
    import('express'), import('cookie-parser'), import('jsonwebtoken'), import('../../src/config/prisma.js'),
    import('../../src/routes/management/management.routes.js'),
    import('../../../shared/management/defaults/config.defaults.mjs'), import('../../../shared/management/config/normalize.mjs'),
  ]);
  test('Aktive Management-API: Einrichtung, Freigabe, Jahresbetrieb und bereinigte Endpunkte', async t => {
    await prisma.$transaction([
      prisma.auditLog.deleteMany({ where: { action: { startsWith: 'management.' } } }),
      prisma.managementTransaction.deleteMany(), prisma.managementLoan.deleteMany(),
      prisma.managementAsset.deleteMany(), prisma.managementPeriod.deleteMany(),
      prisma.customer.deleteMany({ where: { companyName: 'Management-Testzeiten' } }),
      prisma.user.deleteMany({ where: { email: { endsWith: '@management.test' } } }),
    ]);
    const app = express(); app.use(express.json()); app.use(cookieParser()); app.use('/api/management', router);
    const server = await new Promise(resolve => { const next = app.listen(0, '127.0.0.1', () => resolve(next)); });
    const origin = `http://127.0.0.1:${server.address().port}/api/management`;
    const users = [];
    for (const role of ['admin', 'manager', 'user']) users.push(await prisma.user.create({ data: { email: `${role}-${Date.now()}@management.test`, login: `${role}-${Date.now()}`, passwordHash: 'test-fixture', role } }));

    /** Ruft einen API-Endpunkt mit der gewünschten Testrolle und isolierter Jahresbasis auf. */
    async function request(path = '', { method = 'GET', data, role = 'admin', anonymous = false } = {}) {
      const user = users.find(item => item.role === role);
      const token = jwt.sign({ id: user.id, authVersion: user.authVersion }, process.env.JWT_ACCESS_SECRET);
      const target = new URL(`${origin}${path}`); if (!target.searchParams.has('year')) target.searchParams.set('year', '2026');
      const response = await fetch(target, { method, headers: { 'content-type': 'application/json', ...(anonymous ? {} : { cookie: `token=${token}` }) }, body: data === undefined ? undefined : JSON.stringify(data) });
      return { status: response.status, body: response.headers.get('content-type')?.includes('application/json') ? await response.json() : null };
    }
    try {
      await t.test('Zugriff verlangt Managementrolle und ein gültiges Geschäftsjahr', async () => {
        assert.equal((await request('', { anonymous: true })).status, 401); assert.equal((await request('', { role: 'user' })).status, 403);
        assert.equal((await request('', { role: 'manager' })).status, 200); assert.equal((await request('?year=2026.5')).status, 400);
      });
      await t.test('Neuer Snapshot enthält ausschließlich aktive Jahresdaten und verwendete Referenzen', async () => {
        const snapshot = (await request()).body; assert.equal(snapshot.config.mode, 'full'); assert.deepEqual(snapshot.config.setup.assets, []);
        assert.equal('transactions' in snapshot, false); assert.equal('calculation' in snapshot, false); assert.equal('rules' in snapshot.config, false);
        const references = (await request('/references')).body; assert.ok(references.employees.some(employee => employee.id === users[0].id)); assert.equal('projects' in references, false);
      });
      await t.test('Anlagen und Restschulden aus früheren Tabellen werden vor der ersten Einrichtung übernommen', async () => {
        await prisma.managementAsset.create({ data: { name: 'Altmaschine', acquiredAt: new Date('2020-01-01'), purchaseCost: 10000, residualValue: 1000, usefulLifeYears: 10 } });
        await prisma.managementLoan.create({ data: { name: 'Alter Kredit', startDate: new Date('2020-01-01'), principal: 10000, interestRate: 5, repayments: { create: { date: new Date('2021-01-01'), amount: 1000 } } } });
        const snapshot = (await request()).body; assert.equal(snapshot.config.setup.assets[0].acquiredAt, '2020-01-01'); assert.equal(snapshot.config.setup.loans[0].balance, 9000);
      });
      const config = prepareSetupConfig({ config: defaultConfig() }); config.mode = 'full'; config.setup.companyName = '';
      config.costCenters = [{ id: 'workshop', name: 'Werkstatt', kind: 'production', hours: 1000, area: 100, employees: 1, directBase: 0, redistributionKey: 'hours', activityIds: ['cutting', 'edging'], consumption: 0, usage: 0 }];
      config.setup.annualCosts = [{ id: 'rent', name: 'Miete', costTypeId: 'space', amount: 12000, actualAmount: 3000, centerId: 'workshop', keyId: 'area', source: 'manual' }];
      await t.test('Entwurf speichert Revision und verhindert spätere Wiederübernahme entfernter Altanlagen', async () => {
        assert.equal((await request('/settings', { method: 'PUT', data: { config, revision: 0 } })).status, 200);
        assert.equal((await request('/settings', { method: 'PUT', data: { config, revision: 0 } })).status, 409);
        const snapshot = (await request()).body; assert.deepEqual(snapshot.config.setup.assets, []); assert.equal(snapshot.setupCalculation.totalCosts, 12000); assert.equal(snapshot.operatingActual.totalCosts, 3000);
        assert.equal(await prisma.managementAsset.count(), 1);
      });
      await t.test('Unvollständige und veraltete Freigaben werden abgelehnt', async () => {
        assert.equal((await request('/setup/approve', { method: 'POST', data: { revision: 1 } })).status, 400);
        assert.equal((await request('/setup/approve', { method: 'POST', data: { revision: 999 } })).status, 409);
      });
      const customer = await prisma.customer.create({ data: { companyName: 'Management-Testzeiten' } });
      const project = await prisma.project.create({ data: { customerId: customer.id, title: 'Management-Stundentest' } });
      await prisma.timeEntry.create({ data: { projectId: project.id, userId: users[0].id, workType: 'cutting', duration: 60, startedAt: new Date('2026-01-01T08:00:00Z'), endedAt: new Date('2026-01-01T09:00:00Z') } });
      await t.test('Freigabe fixiert die aktuelle Zeitberichtsbasis', async () => {
        config.setup.companyName = 'Schreinerei Test'; config.setup.hoursMode = 'recorded';
        assert.equal((await request('/settings', { method: 'PUT', data: { config, revision: 1 } })).status, 200);
        assert.equal((await request('/setup/approve', { method: 'POST', data: { revision: 2, note: 'Erste Version' } })).status, 200);
        const published = (await request()).body; assert.equal(published.config.setup.approvals.length, 1); assert.equal(published.operatingPlan.rates[0].hours, 1);
      });
      await t.test('Neue Kalenderberichte ändern Ist und Entwurf, jedoch keine veröffentlichten Planstunden', async () => {
        await prisma.timeEntry.create({ data: { projectId: project.id, userId: users[0].id, workType: 'edging', duration: 30, startedAt: new Date('2026-01-01T09:00:00Z'), endedAt: new Date('2026-01-01T09:30:00Z') } });
        const live = (await request()).body; assert.equal(live.operatingActual.actualHours.total, 1.5); assert.equal(live.operatingPlan.rates[0].hours, 1); assert.equal(live.setupCalculation.rates[0].hours, 1.5);
      });
      await t.test('Manipulierte Historie und geänderte Plansummen ersetzen keine freigegebene Version', async () => {
        const current = (await request()).body; current.config.setup.annualCosts[0].amount = 24000; current.config.setup.annualCosts[0].actualAmount = 4000; current.config.setup.approvals = [{ version: 999 }];
        assert.equal((await request('/settings', { method: 'PUT', data: { config: current.config, revision: current.revision } })).status, 200);
        const changed = (await request()).body; assert.equal(changed.config.setup.approvals[0].version, 1); assert.equal(changed.setupCalculation.totalCosts, 24000); assert.equal(changed.operatingPlan.totalCosts, 12000); assert.equal(changed.operatingActual.totalCosts, 4000);
        assert.equal((await request('/setup/approve', { method: 'POST', data: { revision: changed.revision } })).status, 200);
        const versioned = (await request()).body; assert.equal(versioned.config.setup.approvals.length, 2); assert.equal(versioned.config.setup.approvals[0].totalCosts, 12000); assert.equal(versioned.operatingPlan.totalCosts, 24000);
      });
      await t.test('Folgejahr zeigt gespeicherte Vorjahreswerte und erlaubt eine eigene Easy-Freigabe', async () => {
        const next = defaultConfig(); next.setup.initialized = true; next.setup.companyName = 'Folgejahr'; next.easyRates = [{ id: 'easy', name: 'Werkstatt', rate: 50 }];
        assert.equal((await request('/settings?year=2027', { method: 'PUT', data: { config: next, revision: 0 } })).status, 200);
        const snapshot = (await request('?year=2027')).body; assert.equal(snapshot.previous.plan.totalCosts, 24000); assert.equal(snapshot.previous.actual.totalCosts, 4000);
        assert.equal((await request('/setup/approve?year=2027', { method: 'POST', data: { revision: 1 } })).status, 200);
      });
      await t.test('Überlappende Jahre und unbekannte Mitarbeiter werden abgelehnt', async () => {
        assert.equal((await request('/settings?year=2025', { method: 'PUT', data: { config: { ...config, startMonth: 4 }, revision: 0 } })).status, 400);
        const bad = structuredClone(config); bad.setup.staff = [{ id: 'staff', name: 'Fehlt', userId: '00000000-0000-0000-0000-000000000000', annualHours: 1000, workDays: 260, holidays: 10, vacation: 30, sickDays: 10, trainingDays: 5, hoursPerDay: 8, productivity: 80, annualCost: 0, fte: 1, allocations: [{ centerId: 'workshop', percent: 100 }] }];
        assert.equal((await request('/settings', { method: 'PUT', data: { config: bad, revision: (await request()).body.revision } })).status, 400);
      });
      await t.test('Entfernte Vorfall-, Zahlungs- und Buchungs-APIs sind nicht mehr erreichbar', async () => {
        for (const path of ['/transactions', '/rules/apply', '/assets', '/loans', '/payments/test', '/repayments/test']) assert.equal((await request(path, { method: 'POST', data: {} })).status, 404);
        assert.equal((await request('/transactions')).status, 404);
        assert.equal((await request('/assets/test', { method: 'DELETE' })).status, 404);
      });
      await t.test('Konfiguration und Freigaben erzeugen Auditnachweise', async () => {
        assert.ok(await prisma.auditLog.count({ where: { action: 'management.settings.save' } }) >= 3);
        assert.ok(await prisma.auditLog.count({ where: { action: 'management.setup.approve' } }) >= 3);
      });
    } finally {
      await new Promise(resolve => server.close(resolve)); await prisma.$disconnect();
    }
  });
}
