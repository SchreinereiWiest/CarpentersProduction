import { loadEticketSettings, printEticket } from "./eticket.service.js";

export async function getEticketConfiguration(_req, res, next) {
  try {
    const settings = await loadEticketSettings();
    return res.json({
      ...settings,
      printer: {
        language: settings.printer.language,
        dpi: settings.printer.dpi
      },
      printerConfigured: Boolean(settings.printer.host)
    });
  } catch (error) {
    return next(error);
  }
}

export async function createEticketPrint(req, res, next) {
  try {
    const requestOrigin = req.get("origin");
    const scanBaseUrl = requestOrigin ? new URL(requestOrigin).origin : `${req.protocol}://${req.get("host")}`;
    const result = await printEticket({ ...req.body, scanBaseUrl });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}
