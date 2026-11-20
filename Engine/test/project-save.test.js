import assert from "node:assert/strict";
import test from "node:test";
import { mergeManualPartList } from "../src/cabinet/projectSave.js";

test("keeps a manually changed legacy part and skips its generated duplicate", () => {
  const generated = [{
    PID: "1",
    _generatedId: "cabinet:root",
    _cabinetId: "cabinet",
    Objektname: "Korpus",
    Plattentyp: "KO",
    Children: [
      { PID: "2", _generatedId: "cabinet:part:1", _cabinetId: "cabinet", Objektname: "Seiten", Plattentyp: "Seite", L: 700 },
      { PID: "3", _generatedId: "cabinet:part:2", _cabinetId: "cabinet", Objektname: "Rückwand", Plattentyp: "Back", MID: "generated" }
    ]
  }];
  const manualBack = {
    PID: "legacy-back",
    _cabinetId: "cabinet",
    Objektname: "Rückwand manuell",
    Plattentyp: "Back",
    MID: "legacy-manual",
    manual: true,
    _manualOrigin: {
      _generatedId: "cabinet:part:2",
      _cabinetId: "cabinet",
      Objektname: "Rückwand",
      Plattentyp: "Back"
    }
  };
  const existing = [{
    PID: "old-root",
    _cabinetId: "cabinet",
    Objektname: "Korpus",
    Plattentyp: "KO",
    Children: [manualBack]
  }];

  const [root] = mergeManualPartList(generated, existing);
  assert.equal(root.Children.length, 2);
  assert.equal(root.Children.filter(part => part.Plattentyp === "Back").length, 1);
  assert.deepEqual(root.Children.find(part => part.Plattentyp === "Back"), manualBack);
});
