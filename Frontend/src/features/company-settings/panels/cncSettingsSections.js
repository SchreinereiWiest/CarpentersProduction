const STRATEGY_PANELS = {
    "connector.clamex": { id: "connector.clamex", name: "Clamex" },
    "shelf.row": { id: "shelf.row", name: "Fachboden" },
    "drawer.legrabox": { id: "drawer.legrabox", name: "Legrabox" },
    "back.groove": { id: "back.groove", name: "Rückwandnut" },
    "back.rabbet": { id: "back.rabbet", name: "Rückwandfalz" }
};

export const getMachiningParameterSections = (usedStrategies = []) => {
    const hasDrillConnectorSettings = usedStrategies.some(strategy => (
        strategy.id === "connector.drill" ||
        strategy.id === "connector.screw"
    ));

    return [
        { id: "assignments", name: "Zuordnungen" },
        { id: "fronts", name: "Fronten" },
        ...(hasDrillConnectorSettings
            ? [{ id: "connector.drill", name: "Bohrverbinder" }]
            : []),
        ...usedStrategies
            .filter(strategy => (
                strategy.id !== "connector.drill" &&
                strategy.id !== "connector.screw"
            ))
            .map(strategy => STRATEGY_PANELS[strategy.id])
            .filter(Boolean)
    ];
};
