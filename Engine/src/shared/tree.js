const childrenOf = node => Array.isArray(node?.children) ? node.children : [];

export const findTreeNode = (nodes = [], id) => {
    for (const node of nodes) {
        if (node.id === id) {
            return node;
        }

        const found = findTreeNode(childrenOf(node), id);
        if (found) {
            return found;
        }
    }

    return null;
};

export const findTreeParent = (nodes = [], childId, parent = null) => {
    for (const node of nodes) {
        if (node.id === childId) {
            return parent;
        }

        const found = findTreeParent(childrenOf(node), childId, node);
        if (found) {
            return found;
        }
    }

    return null;
};

export const updateTree = (nodes = [], id, updateNode) => nodes.map(node => {
    if (node.id === id) {
        return updateNode(node);
    }

    const children = childrenOf(node);
    if (children.length === 0) {
        return node;
    }

    return {
        ...node,
        children: updateTree(children, id, updateNode)
    };
});

export const flattenTree = (nodes = []) => {
    const result = [];

    const walk = items => {
        items.forEach(item => {
            result.push(item);
            walk(childrenOf(item));
        });
    };

    walk(nodes);
    return result;
};
