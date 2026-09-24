

export const flattenPartList = (
    partList = []
) => {

    const result = [];

    const walk = (
        node,
        parent = null
    ) => {

        if (!node) {
            return;
        }

        const isPart =
            node.PID &&
            (
                node.Plattentyp ||
                node.Objektname
            );

        if (isPart) {
            result.push({
                ...node,
                parentPID: parent?.PID ?? null
            });
        }

        if (
            Array.isArray(node.Children)
        ) {
            node.Children.forEach(child => {
                walk(child, node);
            });
        }
    };

    partList.forEach(root => {
        walk(root);
    });

    return result;
};