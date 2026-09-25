import { calculateSplitSizes } from "./calcSplitSizes";
import { updateSectionTree } from "./updateSectionTree";
import { createId } from "../../components/cabinetEditor";


export const splitSection = (
    sectionId,
    spec,
    direction,
    activeCabinet,
    updateActiveCabinet,
    setSelectedElement,
    gap
) => {

    if (!activeCabinet) {
        return;
    }


    /*
     * Die gewünschte Section im Baum suchen
     */

    const findSection = (
        sections
    ) => {

        for (const section of sections) {

            if (section.id === sectionId) {
                return section;
            }


            if (
                section.children &&
                section.children.length > 0
            ) {

                const found =
                    findSection(
                        section.children
                    );

                if (found) {
                    return found;
                }
            }
        }


        return null;
    };


    const section =
        findSection(
            activeCabinet.sections ?? []
        );


    if (!section) {

        console.warn(
            "Section nicht gefunden:",
            sectionId
        );

        return;
    }


    /*
     * Größe bestimmen
     */

    const totalSize =
        direction === "vertical"
            ? Number(section.height)
            : Number(section.width);


    if (
        !Number.isFinite(totalSize) ||
        totalSize <= 0
    ) {

        console.error(
            "Ungültige Section-Größe:",
            section
        );

        return;
    }


    /*
     * Split berechnen
     *
     * Beispiel:
     * 1000mm
     * 1:1:1:145mm
     * Fuge 3mm
     *
     * => 282 / 282 / 282 / 145
     */

    const sizes = calculateSplitSizes(
    totalSize,
    spec,
    0,
    false
);


    if (sizes.length === 0) {

        console.warn(
            "Keine gültige Section-Aufteilung:",
            spec
        );

        return;
    }


    /*
     * Untersektionen erzeugen
     */

    let position = 0;


    const children =
        sizes.map(
            (size, index) => {

                const numericSize =
                    Number(size);


                const child = {

                    id:
                        createId(),

                    type:
                        "section",

                    parentId:
                        section.id,

                    name:
                        `${section.name ?? "Section"}.${index + 1}`,


                    /*
                     * Position
                     */

                    x:
                        direction === "vertical"
                            ? section.x
                            : section.x + position,

                    y:
                        direction === "vertical"
                            ? section.y + position
                            : section.y,


                    /*
                     * Größe
                     */

                    width:
                        direction === "vertical"
                            ? section.width
                            : numericSize,

                    height:
                        direction === "vertical"
                            ? numericSize
                            : section.height,


                    /*
                     * Jede neue Section
                     * kann später selbst
                     * wieder geteilt werden.
                     */

                    children: []
                };


                position +=
                    numericSize + gap;


                return child;
            }
        );


    /*
     * Nur die ausgewählte Section
     * im Baum verändern.
     */

    const newSections =
        updateSectionTree(
            activeCabinet.sections ?? [],
            sectionId,
            currentSection => ({

                ...currentSection,

                splitDirection:
                    direction,

                splitSpec:
                    spec,

                splitGap:
                    gap,

                children
            })
        );


    /*
     * Gesamten Cabinet-State aktualisieren,
     * aber nur sections an der
     * entsprechenden Stelle verändern.
     */

    updateActiveCabinet({
        sections:
            newSections
    });


    /*
     * Auswahl auf der bestehenden
     * Section lassen.
     */

    setSelectedElement({
        ...section,
        type: "section",
        children
    });
};