

export const cncToSvg = (
    x,
    y,
    part
) => {

    const cncX = Number(x);
    const cncY = Number(y);

    const partLength =
        Number(part.L);

    const partWidth =
        Number(part.B);

    if (
        !Number.isFinite(cncX) ||
        !Number.isFinite(cncY) ||
        !Number.isFinite(partLength) ||
        !Number.isFinite(partWidth)
    ) {
        return null;
    }

    return {
        x: cncY,
        y: cncX
    };
};