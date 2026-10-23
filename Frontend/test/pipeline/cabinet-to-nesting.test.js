import { describe, expect, it, vi } from 'vitest';

import { buildPartList } from '@Engine/cabinet/partList/buildPartList.js';
import { flattenPartList } from '@Engine/cnc/flattenPartList.js';
import { groupCncParts } from '@Engine/cnc/groupCncParts.js';
import { calculateNesting } from '@Engine/nesting/nestingAlgorythm.js';
import {
  cabinet,
  materials,
  storageMaterials,
} from '../fixtures/project.fixture.js';

describe('Projektpipeline Korpus → Stückliste → CNC → Nesting', () => {
  it('dreht Frontmaße bei querer Maserrichtung und behält hochkant als Standard', async () => {
    const front = {
      id: 'front-grain',
      name: 'Front Maserung',
      x: 0,
      y: 0,
      width: 420,
      height: 700,
      children: [],
    };

    const verticalPartList = await buildPartList([{
      ...cabinet,
      fronts: [front],
    }], materials);
    const horizontalPartList = await buildPartList([{
      ...cabinet,
      frontGrainDirection: 'horizontal',
      fronts: [front],
    }], materials);
    const verticalFront = verticalPartList[0].Children.find(
      part => part.Plattentyp === 'Front',
    );
    const horizontalFront = horizontalPartList[0].Children.find(
      part => part.Plattentyp === 'Front',
    );

    expect(verticalFront).toMatchObject({ L: 700, B: 420 });
    expect(horizontalFront).toMatchObject({ L: 420, B: 700 });
  });

  it('fasst gleiche Fachböden, Mittelwände und Fronten bereits in der Stückliste zusammen', async () => {
    const section = {
      id: 'section-1',
      type: 'section',
      x: 19,
      y: 19,
      width: 562,
      height: 682,
      children: [],
      functionConfig: [
        {
          id: 'shelf-1',
          type: 'shelf',
          compartmentCount: 4,
          shelfFrontOffset: 0,
        },
        {
          id: 'wall-1',
          type: 'middleWall',
          orientation: 'horizontal',
          positionReference: 'sectionBottom',
          positionOffset: 200,
        },
        {
          id: 'wall-2',
          type: 'middleWall',
          orientation: 'horizontal',
          positionReference: 'sectionBottom',
          positionOffset: 400,
        },
      ],
    };
    const cabinetWithAssemblies = {
      ...cabinet,
      sections: [section],
      fronts: [
        { id: 'front-1', name: 'Front 1', x: 0, y: 0, width: 300, height: 700, children: [] },
        { id: 'front-2', name: 'Front 2', x: 300, y: 0, width: 300, height: 700, children: [] },
        { id: 'front-removed', name: 'Entfernte Front', x: 0, y: 0, width: 300, height: 700, isRemoved: true, children: [] },
      ],
    };
    const partList = await buildPartList([cabinetWithAssemblies], materials);

    const partsByType = type => partList[0].Children.filter(
      part => part.Plattentyp === type,
    );

    expect(partsByType('Fächer')).toHaveLength(1);
    expect(partsByType('Fächer')[0].Anzahl).toBe(3);
    expect(partsByType('Mittelwand')).toHaveLength(1);
    expect(partsByType('Mittelwand')[0].Anzahl).toBe(2);
    expect(partsByType('Front')).toHaveLength(1);
    expect(partsByType('Front')[0].Anzahl).toBe(2);

    const separatedPartList = await buildPartList([{
      ...cabinetWithAssemblies,
      partListSettings: {
        grouping: 'separate',
        separate: {
          shelves: true,
          middleWalls: true,
          fronts: true,
        },
      },
    }], materials);

    expect(separatedPartList.find(group => group.Objektname === 'Fächer').Children).toHaveLength(1);
    expect(separatedPartList.find(group => group.Objektname === 'Fächer').Children[0].Anzahl).toBe(3);
    expect(separatedPartList.find(group => group.Objektname === 'Mittelwände').Children).toHaveLength(1);
    expect(separatedPartList.find(group => group.Objektname === 'Mittelwände').Children[0].Anzahl).toBe(2);
    expect(separatedPartList.find(group => group.Objektname === 'Fronten').Children).toHaveLength(1);
    expect(separatedPartList.find(group => group.Objektname === 'Fronten').Children[0].Anzahl).toBe(2);
  });

  it('erzeugt fertig platzierte Teile und erhält deren CNC-Daten', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const partList = await buildPartList([cabinet], materials);

    expect(partList).toHaveLength(1);
    expect(partList[0]).toMatchObject({
      Objektname: 'Testschrank',
      Plattentyp: 'KO',
      MID: 'BOARD-19',
    });
    expect(partList[0].Children.length).toBeGreaterThanOrEqual(3);

    const flatParts = flattenPartList(partList);
    const productionParts = flatParts.filter((part) => part.Plattentyp !== 'KO');
    const cncParts = productionParts.filter(
      (part) => Array.isArray(part.CNC?.operations) && part.CNC.operations.length > 0,
    );

    expect(cncParts.length).toBeGreaterThan(0);
    expect(cncParts.some((part) => (
      part.CNC.operations.some((operation) => operation.type === 'RNT')
    ))).toBe(true);

    const cncGroups = groupCncParts(partList);
    expect(cncGroups.length).toBeGreaterThan(0);
    expect(cncGroups.flatMap((group) => group.parts)).toEqual(
      expect.arrayContaining(cncParts),
    );

    const nesting = calculateNesting(partList, [], storageMaterials);
    const expectedPartCount = productionParts.reduce(
      (sum, part) => sum + Number(part.Anzahl),
      0,
    );
    const nestedParts = nesting.flatMap((materialGroup) => (
      materialGroup.nestingPlates.flatMap((sheet) => (
        sheet.strips.flatMap((strip) => strip.plates)
      ))
    ));

    expect(nesting).toHaveLength(2);
    expect(nesting.every((group) => group.storageMaterialFound)).toBe(true);
    expect(nestedParts).toHaveLength(expectedPartCount);
    expect(nestedParts.every((part) => (
      Number.isFinite(part.x) && part.original?.PID
    ))).toBe(true);
  });

  it('deaktiviert Rotation für Materialien mit Maserung', async () => {
    const partList = await buildPartList([cabinet], materials);
    const grainedMaterials = storageMaterials.map((material) => ({
      ...material,
      maser: material.materialNumber === 'BOARD-19',
    }));

    const nesting = calculateNesting(
      partList,
      [{ allowRotation: true }, { allowRotation: true }],
      grainedMaterials,
    );
    const boardGroup = nesting.find((group) => group.MID === 'BOARD-19');
    const backGroup = nesting.find((group) => group.MID === 'BACK-8');

    expect(boardGroup.settings.allowRotation).toBe(false);
    expect(boardGroup.storageMaterialHasGrain).toBe(true);
    expect(backGroup.settings.allowRotation).toBe(true);
  });
});
