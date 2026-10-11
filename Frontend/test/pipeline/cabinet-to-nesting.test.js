import { describe, expect, it, vi } from 'vitest';

import { buildPartList } from '../../src/pages/projects/cabinetConfigurator/engine/partList/buildPartList.js';
import { flattenPartList } from '../../src/pages/projects/cnc/cncEngine/falttenPartList.js';
import { groupCncParts } from '../../src/pages/projects/cnc/cncEngine/groupCncParts.js';
import { calculateNesting } from '../../src/pages/projects/nesting/algorythm/nestingAlgorythm.js';
import {
  cabinet,
  materials,
  storageMaterials,
} from '../fixtures/project.fixture.js';

describe('Projektpipeline Korpus → Stückliste → CNC → Nesting', () => {
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
