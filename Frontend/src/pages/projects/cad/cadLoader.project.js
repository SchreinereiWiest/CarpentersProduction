import axios from "axios";
import { parseCadJson } from "./cadParser.project";

 export async function loadCadFile (file) {

    try {

      /*
      Signed Download URL vom Backend holen
      */

      const response = await axios.get(
        `/api/files/download/${file.id}`,
        {
          withCredentials: true
        }
      );

      const url = response.data.url;
      /*
      JSON direkt aus Garage laden
      */

      const jsonResponse =
        await fetch(url);

      let raw =
        await jsonResponse.text();

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
