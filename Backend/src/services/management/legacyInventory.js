import { createAssetDefaults, createLoanDefaults } from '../../../../Engine/management/defaults/forms.defaults.mjs';
import { defaultSetup } from '../../../../Engine/management/defaults/config.defaults.mjs';
import { day } from '../../../../Engine/management/utils/dates.mjs';
import { round } from '../../../../Engine/management/utils/numbers.mjs';

/** Übernimmt vorhandene Anlagen und Restschulden einmalig; bestätigte Einrichtungen lesen keine Alttabellen mehr. */
export async function readLegacyInventory(db, input) {
  const config = structuredClone(input);
  config.setup = { ...defaultSetup(), ...config.setup };
  if (config.setup.initialized) return config;
  if (!config.setup.assets.length) {
    const assets = await db.managementAsset.findMany({ orderBy: { acquiredAt: 'desc' } });
    config.setup.assets = assets.map(asset => ({
      ...createAssetDefaults(asset.id, day(asset.acquiredAt)), name: asset.name,
      purchaseCost: Number(asset.purchaseCost), residualValue: Number(asset.residualValue),
      usefulLifeYears: Number(asset.usefulLifeYears), centerId: asset.centerId,
    }));
  }
  if (!config.setup.loans.length) {
    const loans = await db.managementLoan.findMany({ include: { repayments: true }, orderBy: { startDate: 'desc' } });
    config.setup.loans = loans.map(loan => createLoanDefaults(loan.id, {
      name: loan.name, interestRate: Number(loan.interestRate),
      balance: round(Number(loan.principal) - loan.repayments.reduce((sum, repayment) => sum + Number(repayment.amount), 0)),
    }));
  }
  return config;
}
