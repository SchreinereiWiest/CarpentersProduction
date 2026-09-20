


export function createSections(
    count,
    cabinet
) {

    const thickness =
        cabinet.thickness ?? 19;

    const innerHeight =
        cabinet.height -
        thickness * 2;

    const sectionHeight =
        innerHeight / count;


    return Array.from(
        { length: count },
        (_, index) => ({

            id:
                `section-${index}`,

            index,

            x:
                thickness,

            y:
                thickness +
                index * sectionHeight,

            width:
                cabinet.width -
                thickness * 2,

            height:
                sectionHeight,

            type:
                "section",

            preset:
                null,

            elements: []

        })
    );
}