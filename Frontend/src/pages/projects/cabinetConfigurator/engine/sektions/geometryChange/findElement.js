


export const findElement = (
    elements,
    elementId
) => {

    for (const element of elements) {

        if (element.id === elementId) {
            return element;
        }

        if (
            element.children &&
            element.children.length > 0
        ) {
            const found =
                findElement(
                    element.children,
                    elementId
                );

            if (found) {
                return found;
            }
        }
    }

    return null;
};