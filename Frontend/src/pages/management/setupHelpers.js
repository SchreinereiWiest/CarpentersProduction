import { createUuid } from './managementUuid.js';
import { fiscalRange } from '../../../../shared/management.mjs';
import { createWorkBlocks } from '../../services/companySettings.js';

export function newAsset(year) {
  return { id: createUuid(), name: '', category: 'machine', acquiredAt: `${year}-01-01`, purchaseCost: 0, replacementCost: 0, useReplacement: false, residualValue: 0, usefulLifeYears: 10, usedYears: null, centerId: null, loanId: null, maintenance: 0, energy: 0, space: 0, operating: 0, actualMaintenance: null, actualEnergy: null, actualSpace: null, actualOperating: null, hours: 0, activityIds: [], interestRate: 3, interestAmount: null };
}
export function newStaff(employee, centers, { year, startMonth = 1, settings } = {}) {
  const available = centers.filter(center => center.kind !== 'support');
  let workDays = 260;
  if (year) {
    const range = fiscalRange(year, startMonth); workDays = 0;
    for (const date = new Date(range.start); date <= new Date(range.end); date.setUTCDate(date.getUTCDate() + 1)) if (![0, 6].includes(date.getUTCDay())) workDays++;
  }
  const hoursPerDay = settings ? createWorkBlocks(settings).reduce((sum, block) => sum + block.duration, 0) / 60 : 8;
  return { id: createUuid(), userId: employee?.id || null, name: [employee?.firstName, employee?.lastName].filter(Boolean).join(' ') || employee?.login || 'Mitarbeiter', annualHours: null, workDays, holidays: 10, vacation: 30, sickDays: 10, trainingDays: 5, hoursPerDay, productivity: 80, annualCost: 0, fte: 1,
    allocations: available.map((center, index) => ({ centerId: center.id, percent: index === 0 ? 100 : 0 })) };
}
export function suggestedCenters(activities) {
  const available = new Set(activities.map(item => item.id));
  return [
    ['bankroom', 'Bankraum', 'production', ['assembly', 'finishing']],
    ['machines', 'Standardmaschinen / Zuschnitt & Bekantung', 'production', ['cutting', 'edging']],
    ['cnc', 'CNC', 'machine', ['cnc']],
    ['installation', 'Montage', 'production', ['installation']],
    ['office', 'Verwaltung', 'support', []],
  ].map(([id, name, kind, activityIds]) => ({ id, name, kind, hours: 0, area: 0, employees: 0, directBase: 0, redistributionKey: 'hours', consumption: 0, usage: 0, activityIds: activityIds.filter(id => available.has(id)) }));
}
