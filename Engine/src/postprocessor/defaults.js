import { MACHINING_INTENT_IDS } from "./machiningModel.js";

export const DEFAULT_MACHINING_ASSIGNMENTS = Object.freeze({
    [MACHINING_INTENT_IDS.JOINT_CONNECTOR]: { strategyId: "connector.drill" },
    [MACHINING_INTENT_IDS.JOINT_SCREW]: { strategyId: "connector.screw" },
    [MACHINING_INTENT_IDS.SHELF_PIN_ROW]: { strategyId: "shelf.row" },
    [MACHINING_INTENT_IDS.DRAWER_LEGRABOX]: { strategyId: "drawer.legrabox" },
    [MACHINING_INTENT_IDS.FRONT_DRAWER_MOUNT]: { strategyId: "front.drawerMount" },
    [MACHINING_INTENT_IDS.FRONT_HINGE_CUP]: { strategyId: "front.hingeCup" },
    [MACHINING_INTENT_IDS.FRONT_HINGE_AUXILIARY]: { strategyId: "front.hingeAuxiliary" },
    [MACHINING_INTENT_IDS.CABINET_HINGE_PLATE]: { strategyId: "cabinet.hingePlate" },
    [MACHINING_INTENT_IDS.BACK_GROOVE]: { strategyId: "back.groove" },
    [MACHINING_INTENT_IDS.BACK_RABBET]: { strategyId: "back.rabbet" }
});

export const MACHINING_INTENTS = Object.freeze([
    { id: MACHINING_INTENT_IDS.JOINT_CONNECTOR, label: "Eckverbindung · Verbinder", description: "Verbinderbohrungen zwischen Korpusteilen." },
    { id: MACHINING_INTENT_IDS.JOINT_SCREW, label: "Eckverbindung · Schraube", description: "Schraubbohrungen zwischen Korpusteilen." },
    { id: MACHINING_INTENT_IDS.SHELF_PIN_ROW, label: "Fachbodenträger", description: "Lochreihen für feste oder lose Fachböden." },
    { id: MACHINING_INTENT_IDS.DRAWER_LEGRABOX, label: "Legrabox Korpus", description: "Bohrbilder des Auszugssystems im Korpus." },
    { id: MACHINING_INTENT_IDS.FRONT_DRAWER_MOUNT, label: "Schubkastenfront", description: "Befestigungsbohrungen der Schubkastenfront." },
    { id: MACHINING_INTENT_IDS.FRONT_HINGE_CUP, label: "Topfbandbohrung", description: "Topfbohrung in der Türfront." },
    { id: MACHINING_INTENT_IDS.FRONT_HINGE_AUXILIARY, label: "Topfband-Nebenbohrung", description: "Nebenbohrungen des Topfbands in der Türfront." },
    { id: MACHINING_INTENT_IDS.CABINET_HINGE_PLATE, label: "Topfband-Korpusbohrung", description: "Bohrungen der Montageplatte in der Korpusseite." },
    { id: MACHINING_INTENT_IDS.BACK_GROOVE, label: "Rückwandnut", description: "Nut für eingeschobene Rückwände." },
    { id: MACHINING_INTENT_IDS.BACK_RABBET, label: "Rückwandfalz", description: "Falz für auf- oder eingesetzte Rückwände." }
]);

export const getUsedMachiningStrategies = (assignments = {}, supportedStrategies = []) => {
    const usedIds = new Set(
        Object.values(assignments).map(assignment => assignment?.strategyId).filter(Boolean)
    );
    return supportedStrategies.filter(strategy => usedIds.has(strategy.id));
};
