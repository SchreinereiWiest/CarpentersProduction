import { calculateSplitSizes } from "../calcSplitSizes";
import { createId } from "../../../components/cabinetEditor";

export const createInitialSections = (
    spec,
    direction,
    activeCabinet,
    updateActiveCabinet,
    setSectionCount,
    setSelectedElement
) => {

    if (!activeCabinet) {
        return;
    }


    const gap = activeCabinet.sectionGap ?? 0;


    const totalSize =
        direction === "vertical"
            ? activeCabinet.height -
              activeCabinet.thickness * 2
            : activeCabinet.width -
              activeCabinet.thickness * 2;


    const sizes =
        calculateSplitSizes(
            totalSize,
            spec,
            0
        );


    if (sizes.length === 0) {
        return;
    }


    let position = 0;


    const sections =
        sizes.map((size, index) => {

            const section = {

                id:
                    createId(),

                type:
                    "section",

                x:
                    direction === "vertical"
                        ? activeCabinet.thickness
                        : activeCabinet.thickness +
                          position,

                y:
                    direction === "vertical"
                        ? activeCabinet.thickness +
                          position
                        : activeCabinet.thickness,

                width:
                    direction === "vertical"
                        ? activeCabinet.width -
                          activeCabinet.thickness * 2
                        : size,

                height:
                    direction === "vertical"
                        ? size
                        : activeCabinet.height -
                          activeCabinet.thickness * 2,

                children: []

            };


            position += size + gap;


            return section;

        });


    updateActiveCabinet({
        sections
    });


    setSectionCount(
        sections.length
    );

    setSelectedElement(null);
};