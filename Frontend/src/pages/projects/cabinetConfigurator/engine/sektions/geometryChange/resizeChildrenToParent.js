

export const resizeChildrenToParent = (
    oldParent,
    newParent
) => {

    const children =
        oldParent.children ?? [];

    if (children.length === 0) {
        return children;
    }

    const oldWidth =
        Number(oldParent.width);

    const oldHeight =
        Number(oldParent.height);

    const newWidth =
        Number(newParent.width);

    const newHeight =
        Number(newParent.height);

    if (
        oldWidth <= 0 ||
        oldHeight <= 0 ||
        newWidth <= 0 ||
        newHeight <= 0
    ) {
        return children;
    }

    const scaleX =
        newWidth / oldWidth;

    const scaleY =
        newHeight / oldHeight;


    return children.map(child => {

        const oldChildX =
            Number(child.x);

        const oldChildY =
            Number(child.y);

        const oldChildWidth =
            Number(child.width);

        const oldChildHeight =
            Number(child.height);


        const newChild = {
            ...child,

            x:
                newParent.x +
                (oldChildX - oldParent.x) *
                    scaleX,

            y:
                newParent.y +
                (oldChildY - oldParent.y) *
                    scaleY,

            width:
                oldChildWidth * scaleX,

            height:
                oldChildHeight * scaleY
        };


        // Rekursiv auch die
        // darunterliegenden Children anpassen
        if (
            child.children &&
            child.children.length > 0
        ) {

            newChild.children =
                resizeChildrenToParent(
                    child,
                    newChild
                );
        }


        return newChild;
    });
};