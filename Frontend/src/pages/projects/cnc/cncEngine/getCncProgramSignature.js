export const getCncProgramSignature = (part) => {
  if (!part) {
    return "";
  }

  /*
   * Felder, die niemals Bestandteil der CNC-Signatur sein sollen.
   * Diese sind entweder technische IDs oder Referenzen auf konkrete
   * Bauteile/Abschnitte.
   */
  const ignoredKeys = new Set([
    "id",
    "pid",
    "bpid",
    "parentpid",
    "sectionid",
    "wallid",
    "instanceid",
    "cabinetid",
    "partid"
  ]);


  const normalize = (value) => {

    // Arrays
    if (Array.isArray(value)) {
      return value.map(normalize);
    }


    // Objekte
    if (
      value !== null &&
      typeof value === "object"
    ) {
      return Object.keys(value)
        .sort()
        .reduce((result, key) => {

          // ID-Felder ignorieren
          if (ignoredKeys.has(key.toLowerCase())) {
            return result;
          }

          result[key] = normalize(value[key]);

          return result;

        }, {});
    }


    // Numerische Strings vereinheitlichen
    if (
      typeof value === "string" &&
      value.trim() !== "" &&
      Number.isFinite(Number(value))
    ) {
      return Number(value);
    }


    return value;
  };


  /*
   * Falls aktuell keine functionConfig vorhanden ist,
   * können wir ersatzweise die tatsächlichen CNC-Operationen
   * verwenden.
   *
   * Auch dort werden IDs durch normalize() entfernt.
   */
  const cncConfig = part.CNC?.operations ?? [];

   const operationsWithoutIds = (cncConfig ?? []).map(
    ({ id, source, ...operation }) => operation
    );

    // console.log(operationsWithoutIds);

  const programData = {
    L: normalize(part.L),
    B: normalize(part.B),
    T: normalize(part.T),

    functionConfig: normalize(operationsWithoutIds)
  };

//   console.log(JSON.stringify(programData));
  return JSON.stringify(programData);
};