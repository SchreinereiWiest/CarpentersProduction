import { parseCadJson } from "./cadParser.project";
import { getProjectAssetBlob } from "../../../services/projectAssetCache.js";

 export async function loadCadFile (file) {

    try {

      const blob = await getProjectAssetBlob(file);
      let raw = await blob.text();

      /*
      defekten JSON Tail entfernen
      */

      raw = raw.replace(
        /,\s*]/,
        "]"
      );

      const json =
        JSON.parse(raw);

      return parseCadJson(json);

    } catch (error) {

      console.error(
        "CAD Datei konnte nicht geladen werden",
        error
      );

      return [];
    }
  };
