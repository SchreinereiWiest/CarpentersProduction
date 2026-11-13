export const DEFAULT_MACHINING_LOCATIONS = Object.freeze([
    { id: "A", label: "A", anchorCorner: "top-left", outputCode: "A", mirrorAxes: { x: false, y: false } },
    { id: "AB", label: "AB", anchorCorner: "top-left", outputCode: "AB", mirrorAxes: { x: false, y: false } },
    { id: "AD", label: "AD", anchorCorner: "top-left", outputCode: "AD", mirrorAxes: { x: false, y: false } },
    { id: "DA", label: "DA", anchorCorner: "top-right", outputCode: "DA", mirrorAxes: { x: true, y: false } },
    { id: "DB", label: "DB", anchorCorner: "top-right", outputCode: "DB", mirrorAxes: { x: true, y: false } },
    { id: "D", label: "D", anchorCorner: "top-right", outputCode: "D", mirrorAxes: { x: true, y: false } }
]);

const xor = (left, right) => Boolean(left) !== Boolean(right);

export const resolveProgramHeader = ({ manifest, part, defaultStopId = "A" }) => {
    const locations = Array.isArray(manifest?.machiningLocations) && manifest.machiningLocations.length
        ? manifest.machiningLocations
        : DEFAULT_MACHINING_LOCATIONS;
    const raw = part?.CNC?.header ?? {};
    const stopId = String(raw.stopId ?? defaultStopId);
    const location = locations.find(entry => entry.id === stopId) ?? locations[0];
    const edgeAtStop = raw.edgeAtStop === "back" ? "back" : "front";
    const sx = raw.sx === true;
    const sy = raw.sy === true;
    const machineMirrorX = location.mirrorAxes?.x === true;
    const machineMirrorY = xor(location.mirrorAxes?.y === true, edgeAtStop === "back");
    const cornerLabel = location.anchorCorner === "top-right" ? "oben rechts" : "oben links";

    return {
        stopId: location.id,
        stopLabel: location.label ?? location.id,
        outputCode: location.outputCode ?? location.id,
        anchorCorner: location.anchorCorner ?? "top-left",
        cornerLabel,
        edgeAtStop,
        edgeLabel: edgeAtStop === "back" ? "Bauteilrücken am Anschlag" : "Frontkante am Anschlag",
        comment: String(raw.comment ?? "").replace(/[\r\n]+/g, " ").trim(),
        sx,
        sy,
        machineMirrorX,
        machineMirrorY,
        displayMirrorX: xor(machineMirrorX, sx),
        displayMirrorY: xor(machineMirrorY, sy),
        locations
    };
};
