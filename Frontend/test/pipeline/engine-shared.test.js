import { describe, expect, it } from 'vitest';
import {
    cloneCabinetWithFreshIds,
    createAvailableSection
} from '@Engine/cabinet/cabinet.js';
import { getMiddleWallCenter } from '@Engine/cabinet/geometry/middleWall.js';
import { resizeCabinetContents } from '@Engine/cabinet/geometry/resizeCabinetContents.js';
import { generateFronts } from '@Engine/cabinet/sektions/front/generateFronts.js';
import {
    findTreeNode,
    findTreeParent,
    flattenTree,
    updateTree
} from '@Engine/shared/tree.js';

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
            functionConfig: [],
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

    it('uses negative outer front gaps as overhangs when generating and resizing fronts', () => {
        let generatedCabinet;

        generateFronts(
            '1',
            'vertical',
            {
                width: 600,
                height: 1000,
                frontGap: 3,
                frontGapLeft: -10,
                frontGapRight: -20,
                frontGapTop: -5,
                frontGapBottom: -15
            },
            changes => {
                generatedCabinet = changes;
            },
            () => {}
        );

        expect(generatedCabinet.fronts[0]).toMatchObject({
            x: -10,
            y: -5,
            width: 630,
            height: 1020
        });

        const resized = resizeCabinetContents(
            {
                width: 600,
                height: 1000,
                frontGap: 3,
                frontGapLeft: -10,
                frontGapRight: -20,
                frontGapTop: -5,
                frontGapBottom: -15,
                frontLayout: {
                    spec: '1',
                    direction: 'vertical'
                },
                fronts: generatedCabinet.fronts,
                sections: []
            },
            { width: 700, height: 1200 }
        );

        expect(resized.fronts[0]).toMatchObject({
            x: -10,
            y: -5,
            width: 730,
            height: 1220
        });
    });

    it('preserves functions when front-derived sections are regenerated at small sizes', () => {
        const functionConfig = [{ id: 'shelf-1', type: 'shelf' }];
        const cabinet = {
            width: 600,
            height: 1000,
            thickness: 0,
            frontGap: 0,
            frontLayout: {
                spec: '1:300mm',
                direction: 'vertical'
            },
            sectionLayout: {
                source: 'fronts'
            },
            fronts: [
                { id: 'front-1', x: 0, y: 0, width: 600, height: 700, children: [] },
                { id: 'front-2', x: 0, y: 700, width: 600, height: 300, children: [] }
            ],
            sections: [
                { id: 'section-1', frontId: 'front-1', x: 0, y: 0, width: 600, height: 700, functionConfig, children: [] },
                { id: 'section-2', frontId: 'front-2', x: 0, y: 700, width: 600, height: 300, functionConfig: [], children: [] }
            ]
        };

        const invalidSize = resizeCabinetContents(cabinet, { height: 200 });
        const smaller = resizeCabinetContents(invalidSize, { height: 500 });
        const larger = resizeCabinetContents(smaller, { height: 1500 });

        expect(invalidSize.sections).toHaveLength(2);
        expect(invalidSize.sections[0].functionConfig).toBe(functionConfig);
        expect(smaller.sections[0].functionConfig).toBe(functionConfig);
        expect(larger.sections[0].functionConfig).toBe(functionConfig);
        expect(larger.sections[0].id).toBe('section-1');
    });
});
