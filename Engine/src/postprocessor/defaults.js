export const DEFAULT_MACHINING_ASSIGNMENTS = Object.freeze({
    cornerJoint: { strategyId: "connector.drill" },
    shelfSupport: { strategyId: "shelf.row" },
    drawerSystem: { strategyId: "drawer.legrabox" },
    backPanelGroove: { strategyId: "back.groove" },
    backPanelRabbet: { strategyId: "back.rabbet" }
});

export const MACHINING_INTENTS = Object.freeze([
    { id: "cornerJoint", label: "Eckverbindung", description: "Verbindung von Seite, Boden und Deckel." },
    { id: "shelfSupport", label: "Fachbodenträger", description: "Aufnahme fester oder loser Fachböden." },
    { id: "drawerSystem", label: "Auszugssystem", description: "Bohrbilder und Bearbeitungen für Schubkästen." },
    { id: "backPanelGroove", label: "Rückwandnut", description: "Nut für eingeschobene Rückwände." },
    { id: "backPanelRabbet", label: "Rückwandfalz", description: "Falz für auf- oder eingesetzte Rückwände." }
]);

export const getUsedMachiningStrategies = (assignments = {}, supportedStrategies = []) => {
    const usedIds = new Set(
        Object.values(assignments).map(assignment => assignment?.strategyId).filter(Boolean)
    );
    return supportedStrategies.filter(strategy => usedIds.has(strategy.id));
};
