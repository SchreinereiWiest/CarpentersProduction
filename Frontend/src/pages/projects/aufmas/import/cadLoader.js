import { getProjectAssetBlob } from "../../../../services/projectAssetCache.js";
import { parseCadJson } from "./cadParser.js";

export async function loadCadFile(file) {
  try {
    const blob = await getProjectAssetBlob(file);
    let raw = await blob.text();
    raw = raw.replace(/,\s*]/, "]");
    return parseCadJson(JSON.parse(raw));
  } catch (error) {
    console.error("CAD-Datei konnte nicht geladen werden", error);
    return [];
  }
}
