import { describe, expect, it } from 'vitest';
import {
    cloneCabinetWithFreshIds,
    createAvailableSection
} from '@Engine/cabinetConfigurator/cabinet.js';
import { getMiddleWallCenter } from '@Engine/cabinetConfigurator/geometry/middleWall.js';
import {
    findTreeNode,
    findTreeParent,
    flattenTree,
    updateTree
} from '@Engine/utils/tree.js';

describe('shared Engine helpers', () => {
    it('creates the usable cabinet section without UI dependencies', () => {
        expect(createAvailableSection({
            width: 600,
            height: 720,
            thickness: 19,
            topExists: true,
            bottomExists: true
        })).toMatchObject({
            x: 19,
            y: 19,
            width: 562,
            height: 682,
            children: []
        });
    });

    it('clones cabinet ids and keeps references consistent', () => {
        const source = {
            id: 1,
            sections: [{ id: 2, parentId: 1, children: [] }]
        };
        const clone = cloneCabinetWithFreshIds(source);

        expect(clone).not.toBe(source);
        expect(clone.id).not.toBe(source.id);
        expect(clone.sections[0].id).not.toBe(source.sections[0].id);
        expect(clone.sections[0].parentId).toBe(clone.id);
    });

    it('uses one implementation for recursive tree operations', () => {
        const tree = [{ id: 1, children: [{ id: 2, children: [] }] }];
        const updated = updateTree(tree, 2, node => ({ ...node, name: 'updated' }));

        expect(findTreeNode(updated, 2)?.name).toBe('updated');
        expect(findTreeParent(updated, 2)?.id).toBe(1);
        expect(flattenTree(updated).map(node => node.id)).toEqual([1, 2]);
    });

    it('shares middle-wall geometry between editor, preview and part generation', () => {
        expect(getMiddleWallCenter({
            wall: { orientation: 'vertical', positionReference: 'sectionRight', positionOffset: 20 },
            section: { x: 40, width: 300 },
            cabinet: { width: 600 }
        })).toBe(320);
    });
});
