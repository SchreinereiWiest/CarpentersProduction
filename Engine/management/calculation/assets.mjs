import { fiscalRange, day } from '../utils/dates.mjs';
import { round } from '../utils/numbers.mjs';

/** Berechnet lineare Jahresabschreibung, bisherigen Vermögenswert und durchschnittlich gebundenes Kapital unter Beachtung von Restwert und Nutzungsdauer. */
export function assetCalculation(asset, year, startMonth) {
  const start = fiscalRange(year, startMonth).start;
  const acquired = day(asset.acquiredAt);
  const base = Number(
    asset.useReplacement ? asset.replacementCost : asset.purchaseCost
  );
  const years =
    asset.usedYears === null ||
    asset.usedYears === "" ||
    asset.usedYears === undefined
      ? Math.max(
          0,
          (new Date(start) - new Date(acquired)) / (365.25 * 86400000)
        )
      : Number(asset.usedYears);
  const annual =
    (base - Number(asset.residualValue)) / Number(asset.usefulLifeYears);
  const remaining = Math.max(0, Number(asset.usefulLifeYears) - years);
  const fraction =
    acquired > start
      ? Math.max(
          0,
          (new Date(fiscalRange(year, startMonth).end) -
            new Date(acquired) +
            86400000) /
            (365.25 * 86400000)
        )
      : 1;
  const depreciation = round(annual * Math.min(1, remaining, fraction));
  const bookValue = round(
    Math.max(
      Number(asset.residualValue),
      Number(asset.purchaseCost) -
        ((Number(asset.purchaseCost) - Number(asset.residualValue)) /
          Number(asset.usefulLifeYears)) *
          years
    )
  );
  return {
    base,
    annualDepreciation: round(annual),
    depreciation,
    bookValue,
    boundCapital: round((base + Number(asset.residualValue)) / 2),
    yearsUsed: round(years)
  };
}
