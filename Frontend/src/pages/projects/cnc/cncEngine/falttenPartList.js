export const flattenPartList = (partList = []) => {

  const result = [];

  const walk = (
    node,
    parent = null,
    cabinetName = null,
    cabinetPID = null
  ) => {

    if (!node) {
      return;
    }

    /*
     * Wenn es sich um einen Korpus-Root handelt,
     * übernehmen wir dessen Namen und PID für alle
     * darunterliegenden Bauteile.
     */
    let currentCabinetName = cabinetName;
    let currentCabinetPID = cabinetPID;

    if (
      node.Plattentyp === "KO" &&
      node.PID &&
      node.Objektname
    ) {
      currentCabinetName = node.Objektname;
      currentCabinetPID = node.PID;
    }

    const isPart =
      node.PID &&
      (node.Plattentyp || node.Objektname);

    if (isPart) {

      result.push({
        ...node,

        parentPID: parent?.PID ?? null,

        cabinetName: node.cabinetName ?? currentCabinetName,

        cabinetPID: node.cabinetPID ?? currentCabinetPID
      });
    }

    if (Array.isArray(node.Children)) {

      node.Children.forEach((child) => {

        walk(
          child,
          node,
          currentCabinetName,
          currentCabinetPID
        );

      });
    }
  };

  partList.forEach((root) => {
    walk(root);
  });

  return result;
};