

export const flattenSections = (
    sections = []
) => {

    const result = [];


    const walk = (
        nodes
    ) => {

        nodes.forEach(
            node => {

                result.push(
                    node
                );


                if (
                    node.children?.length
                ) {

                    walk(
                        node.children
                    );
                }
            }
        );
    };


    walk(
        sections
    );


    return result;
};