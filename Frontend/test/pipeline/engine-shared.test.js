import { describe, expect, it } from 'vitest';
import {
    cloneCabinetWithFreshIds,
    createAvailableSection
} from '@Engine/cabinetConfigurator/cabinet.js';
import { getMiddleWallCenter } from '@Engine/cabinetConfigurator/geometry/middleWall.js';
import { resizeCabinetContents } from '@Engine/cabinetConfigurator/geometry/resizeCabinetContents.js';
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

    it('reflows existing sections and fronts on resize while preserving section functions', () => {
        const functionConfig = [{ id: 'function-1', type: 'middleWall' }];
        const cabinet = {
            width: 600,
            height: 1000,
            thickness: 0,
            frontGap: 0,
            sectionLayout: {
                source: 'split',
                spec: '1:300mm:300mm',
                direction: 'vertical'
            },
            frontLayout: {
                spec: '1:300mm:300mm',
                direction: 'vertical'
            },
            sections: [
                { id: 'section-1', x: 0, y: 0, width: 600, height: 400, functionConfig, children: [] },
                { id: 'section-2', x: 0, y: 400, width: 600, height: 300, children: [] },
                { id: 'section-3', x: 0, y: 700, width: 600, height: 300, children: [] }
            ],
            fronts: [
                { id: 'front-1', x: 0, y: 0, width: 600, height: 400, children: [] },
                { id: 'front-2', x: 0, y: 400, width: 600, height: 300, children: [] },
                { id: 'front-3', x: 0, y: 700, width: 600, height: 300, children: [] }
            ]
        };

        const resized = resizeCabinetContents(cabinet, { height: 1500 });

        expect(resized.sections.map(section => section.height)).toEqual([900, 300, 300]);
        expect(resized.fronts.map(front => front.height)).toEqual([900, 300, 300]);
        expect(resized.sections.map(section => section.id)).toEqual([
            'section-1',
            'section-2',
            'section-3'
        ]);
        expect(resized.sections[0].functionConfig).toBe(functionConfig);

        const temporarilyInvalid = resizeCabinetContents(
            resized,
            { height: 0 }
        );

        expect(temporarilyInvalid.sections).toHaveLength(3);
        expect(temporarilyInvalid.fronts).toHaveLength(3);
    });

    it('only changes the cabinet size when it has no sections or fronts', () => {
        const resized = resizeCabinetContents(
            {
                width: 600,
                height: 1000,
                sections: [],
                fronts: []
            },
            { width: 800 }
        );

        expect(resized).toMatchObject({
            width: 800,
            height: 1000,
            sections: [],
            fronts: []
        });
    });
});
