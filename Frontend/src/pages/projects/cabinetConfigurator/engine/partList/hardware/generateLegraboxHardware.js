import { flattenSections } from "../geometry/flattenSections";

export const generateLegraboxHardware = (
    cabinet
) => {

    const hardware = [];


    const sections =
        flattenSections(
            cabinet.sections ?? []
        );


    sections.forEach(
        section => {

            const config = section.functionConfig ?? {};
            const boxes = Array.isArray(section.functionConfig)
                ? section.functionConfig.filter(func => func.type === "legrabox")
                : Array.isArray(config.legraboxes)
                    ? config.legraboxes
                    : section.functionType === "legrabox"
                        ? [config]
                        : [];


            boxes.forEach(
                (box, index) => {

                    hardware.push({

                        id:
                            box.id,

                        type:
                            "legrabox",

                        name:
                            `Legrabox ${index + 1}`,

                        variant:
                            box.variant,

                        drawerDepth:
                            Number(
                                box.drawerDepth
                            ),

                        positionFromBottom:
                            Number(
                                box.positionFromBottom ??
                                40
                            ),

                        doubling:
                            box.doubling ?? {
                                left: false,
                                right: false,
                                thickness: 0
                            },

                        sectionId:
                            section.id,

                        sectionWidth:
                            Number(
                                section.width
                            ),

                        sectionHeight:
                            Number(
                                section.height
                            )
                    });
                }
            );
        }
    );


    return hardware;
};
