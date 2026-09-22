

export const getLeafFronts = (
    fronts = []
) => {

    const result = [];


    const walk = (
        nodes
    ) => {

        nodes.forEach(
            front => {

                if (
                    front.children?.length
                ) {

                    walk(
                        front.children
                    );

                } else {

                    result.push(
                        front
                    );
                }
            }
        );
    };


    walk(
        fronts
    );


    return result;
};