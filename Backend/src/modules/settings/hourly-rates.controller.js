import { defaultConfig } from "../../../../Engine/src/management/defaults/config.defaults.mjs";
import prisma from "../../infrastructure/database/prisma.js";
import { requestYear } from "../management/services/http.js";
import { write } from "../management/services/persistence.js";

const IDENTIFIER = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
const MAX_RATES = 50;

function normalizeRates(value) {
  if (!Array.isArray(value) || value.length > MAX_RATES) {
    const error = new Error("Ungültige Stundensatzliste");
    error.status = 400;
    throw error;
  }
  const ids = new Set();
  return value.map((rate) => {
    const id = typeof rate?.id === "string" ? rate.id.trim() : "";
    const name = typeof rate?.name === "string" ? rate.name.trim() : "";
    const amount = Number(rate?.rate);
    if (!IDENTIFIER.test(id) || ids.has(id) || !name || name.length > 100) {
      const error = new Error("Bezeichnung oder ID eines Stundensatzes ist ungültig");
      error.status = 400;
      throw error;
    }
    if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) {
      const error = new Error("Stundensatz muss zwischen 0 und 1.000.000 liegen");
      error.status = 400;
      throw error;
    }
    ids.add(id);
    return { id, name, rate: Math.round(amount * 100) / 100 };
  });
}

export async function getHourlyRates(req, res) {
  const year = requestYear(req);
  const period = await prisma.managementPeriod.findFirst({ where: { year } });
  const config = period?.config || defaultConfig();
  res.json({ year, rates: Array.isArray(config.easyRates) ? config.easyRates : [] });
}

export async function saveHourlyRates(req, res) {
  const year = requestYear(req);
  const rates = normalizeRates(req.body?.rates);
  const result = await write(req, "hourly_rates.save", async (db) => {
    const existing = await db.managementPeriod.findFirst({ where: { year } });
    const config = structuredClone(existing?.config || defaultConfig());
    config.easyRates = rates;
    if (!req.license.features.includes("business-management")) config.mode = "easy";
    return existing
      ? db.managementPeriod.update({ where: { id: existing.id }, data: { config, revision: { increment: 1 } } })
      : db.managementPeriod.create({ data: { year, config, revision: 1 } });
  });
  res.json({ year, rates: result.config.easyRates });
}
