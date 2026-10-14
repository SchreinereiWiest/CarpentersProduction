import { describe, expect, it } from "vitest";
import { createThreeWayMerge } from "../../src/services/threeWayMerge.js";

describe("Drei-Wege-Merge", () => {
    it("übernimmt einseitige Änderungen automatisch und meldet echte Konflikte", () => {
        const base = { width: 600, height: 2000, shelves: 2 };
        const local = { width: 800, height: 2000, shelves: 3 };
        const remote = { width: 600, height: 2200, shelves: 4 };

        const merge = createThreeWayMerge(base, local, remote);

        expect(merge.merged).toMatchObject({ width: 800, height: 2200, shelves: 3 });
        expect(merge.conflicts.map(item => item.path)).toEqual(["shelves"]);
        expect(merge.automatic).toEqual(expect.arrayContaining([
            { path: "width", source: "local" },
            { path: "height", source: "server" }
        ]));
    });

    it("führt Arrays über stabile Element-IDs statt über Positionen zusammen", () => {
        const base = [{ id: "corpus-1", width: 600, shelves: 2 }];
        const local = [{ id: "corpus-1", width: 800, shelves: 3 }];
        const remote = [{ id: "corpus-1", width: 600, shelves: 4 }];

        const preview = createThreeWayMerge(base, local, remote);
        const resolved = createThreeWayMerge(base, local, remote, {
            "[id=corpus-1].shelves": "server"
        });

        expect(preview.conflicts[0].path).toBe("[id=corpus-1].shelves");
        expect(resolved.merged).toEqual([{ id: "corpus-1", width: 800, shelves: 4 }]);
    });
});
