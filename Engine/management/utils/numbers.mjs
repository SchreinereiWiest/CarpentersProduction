/** Rundet interne Geld- und Stundenwerte auf zwei Nachkommastellen und gleicht kleine Gleitkommaabweichungen aus. */
export const round = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;
