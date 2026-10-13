export const getMiddleWallCenter = ({ wall, section, cabinet }) => {
    const orientation = wall?.orientation ?? "horizontal";
    const reference = wall?.positionReference;
    const offset = Number(wall?.positionOffset ?? 0);
    const sectionX = Number(section?.x) || 0;
    const sectionY = Number(section?.y) || 0;
    const sectionWidth = Number(section?.width) || 0;
    const sectionHeight = Number(section?.height) || 0;
    const cabinetWidth = Number(cabinet?.width) || 0;
    const cabinetHeight = Number(cabinet?.height) || 0;

    if (orientation === "vertical") {
        switch (reference) {
            case "cabinetLeft":
                return offset;
            case "cabinetRight":
                return cabinetWidth - offset;
            case "sectionLeft":
                return sectionX + offset;
            case "sectionRight":
                return sectionX + sectionWidth - offset;
            default:
                return sectionX + sectionWidth / 2;
        }
    }

    switch (reference) {
        case "cabinetTop":
            return offset;
        case "cabinetBottom":
            return cabinetHeight - offset;
        case "sectionTop":
            return sectionY + offset;
        case "sectionBottom":
            return sectionY + sectionHeight - offset;
        default:
            return sectionY + sectionHeight / 2;
    }
};
