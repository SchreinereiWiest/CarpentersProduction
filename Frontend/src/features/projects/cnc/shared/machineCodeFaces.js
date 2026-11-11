export const getSupportedMachineCodeFaces = descriptor => {
    const configured = Array.isArray(descriptor?.machineCodeFaces)
        ? descriptor.machineCodeFaces
        : ["A"];
    const faces = [...new Set(configured
        .map(face => String(face).toUpperCase())
        .filter(face => face === "A" || face === "B"))];
    return faces.length ? faces : ["A"];
};

export const getPartMachineCodeFaces = (part, descriptor) => {
    const supportedFaces = getSupportedMachineCodeFaces(descriptor);
    const operations = Array.isArray(part?.CNC?.operations) ? part.CNC.operations : [];
    return supportedFaces.filter(face => face === "A" || operations.some(operation => {
        const operationFace = String(operation?.face ?? "A").toUpperCase();
        return operationFace === face || operationFace === "BOTH";
    }));
};

export const resolveMachineCodeFace = (descriptor, requestedFace) => {
    const supportedFaces = getSupportedMachineCodeFaces(descriptor);
    const normalized = String(requestedFace ?? "A").toUpperCase();
    return supportedFaces.includes(normalized) ? normalized : supportedFaces[0];
};

