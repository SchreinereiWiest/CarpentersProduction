export const materials = [
  {
    id: 'board-material',
    materialNumber: 'BOARD-19',
    name: 'Testplatte 19 mm',
    maser: false,
  },
  {
    id: 'back-material',
    materialNumber: 'BACK-8',
    name: 'Testrueckwand 8 mm',
    maser: false,
  },
];

export const cabinet = {
  id: 'cabinet-1',
  name: 'Testschrank',
  quantity: 1,
  width: 600,
  height: 720,
  depth: 560,
  thickness: 19,
  materialId: 'board-material',
  topExists: true,
  bottomExists: true,
  continuous: 'side',
  sections: [],
  fronts: [],
  backPanel: {
    construction: 'groove',
    continuous: 'side',
    thickness: 8,
    materialId: 'back-material',
  },
};

export const legacyCorpus = {
  name: 'Testschrank',
  type: 'KO',
  quantity: 1,
  height: 720,
  width: 600,
  depth: 560,
  MID: 'board-material',
  Children: [
    {
      name: 'Seiten',
      type: 'Seite',
      quantity: 2,
      height: 720,
      width: 560,
      depth: 19,
      MID: 'board-material',
      ELID: '',
      ERID: '',
      ETID: '',
      EBID: '',
    },
  ],
};

export const storageMaterials = [
  {
    materialNumber: 'BOARD-19',
    name: 'Testplatte 19 mm',
    thickness: 19,
    width: 2800,
    height: 2070,
  },
  {
    materialNumber: 'BACK-8',
    name: 'Testrueckwand 8 mm',
    thickness: 8,
    width: 2800,
    height: 2070,
  },
];
