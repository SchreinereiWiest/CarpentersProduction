export const IDENTITY_DXF_TRANSFORM = Object.freeze({
  a: 1,
  b: 0,
  tx: 0,
  ty: 0,
  scale: 1,
  rotation: 0
});

export function applyDxfTransform(point, transform = IDENTITY_DXF_TRANSFORM) {
  const { a = 1, b = 0, tx = 0, ty = 0 } = transform;
  return {
    ...point,
    x: a * point.x - b * point.y + tx,
    y: b * point.x + a * point.y + ty
  };
}

export function createDxfTransform(pdfFirst, pdfSecond, dxfFirst, dxfSecond) {
  const dxfVector = {
    x: dxfSecond.x - dxfFirst.x,
    y: dxfSecond.y - dxfFirst.y
  };
  const pdfVector = {
    x: pdfSecond.x - pdfFirst.x,
    y: pdfSecond.y - pdfFirst.y
  };
  const dxfLength = Math.hypot(dxfVector.x, dxfVector.y);
  const pdfLength = Math.hypot(pdfVector.x, pdfVector.y);
  if (dxfLength < 0.001 || pdfLength < 0.001) return null;

  const scale = pdfLength / dxfLength;
  const rotationRadians =
    Math.atan2(pdfVector.y, pdfVector.x) - Math.atan2(dxfVector.y, dxfVector.x);
  const a = scale * Math.cos(rotationRadians);
  const b = scale * Math.sin(rotationRadians);
  return {
    a,
    b,
    tx: pdfFirst.x - (a * dxfFirst.x - b * dxfFirst.y),
    ty: pdfFirst.y - (b * dxfFirst.x + a * dxfFirst.y),
    scale,
    rotation: (rotationRadians * 180) / Math.PI
  };
}

export function dxfTransformToSvg(transform = IDENTITY_DXF_TRANSFORM) {
  const { a = 1, b = 0, tx = 0, ty = 0 } = transform;
  return `matrix(${a} ${b} ${-b} ${a} ${tx} ${ty})`;
}
