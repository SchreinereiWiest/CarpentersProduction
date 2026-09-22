

export const generateLegraboxCnc = ({
    section,
    cabinet,
    config
}) => {

    const legraboxes =
        config.legraboxes ?? [];


    return {

        operations: [],

        requirements:
            legraboxes.map(
                box => ({

                    type:
                        "legrabox",

                    legraboxId:
                        box.id,

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

                    cabinetId:
                        cabinet.id
                })
            )
    };
};