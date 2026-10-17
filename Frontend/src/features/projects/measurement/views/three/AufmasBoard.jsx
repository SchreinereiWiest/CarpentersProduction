import { useMemo } from "react";
import * as THREE from "three";

function AufmasBoard({
  size,
  position: sourcePosition,
  type,
  offset,
  rotation,
  color
}) {
  const { position, quaternion } = useMemo(() => {
    const position = [...sourcePosition];
    let [length, width, thickness] = size;
    const [offsetX, offsetY, offsetZ] = offset;

    if (offsetX < 0) {
      if (length / offsetX === -1) length *= -1;
      else if (width / offsetX === -1) width *= -1;
      else if (thickness / offsetX === -1) thickness *= -1;
    }
    if (offsetY < 0) {
      if (length / offsetY === -1) length *= -1;
      else if (thickness / offsetY === -1) thickness *= -1;
    }
    if (offsetZ < 0) {
      if (length / offsetZ === -1) length *= -1;
      else if (width / offsetZ === -1) width *= -1;
      else if (thickness / offsetZ === -1) thickness *= -1;
    }

    const baseQuaternion = new THREE.Quaternion();
    if (["Deckel", "Boden"].includes(type)) {
      baseQuaternion.setFromEuler(new THREE.Euler(0, 0, 0));
      thickness *= -1;
    } else if (["Seite links", "Seite rechts"].includes(type)) {
      baseQuaternion.setFromEuler(new THREE.Euler(0, Math.PI / 2, 0));
    } else if (["RW", "FR", "Front"].includes(type)) {
      baseQuaternion.setFromEuler(
        new THREE.Euler(-Math.PI / 2, 0, Math.PI / 2)
      );
    } else if (type === "Sockel") {
      baseQuaternion.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
      thickness *= -1;
    } else {
      baseQuaternion.setFromEuler(new THREE.Euler(0, 0, 0));
      thickness *= -1;
    }

    const [rotationX, rotationY, rotationZ] = rotation.map(
      (value) => (value * Math.PI) / 180
    );
    const worldQuaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(Math.PI / 2, 0, 0)
    );
    const cadQuaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(-rotationX, -rotationY, rotationZ, "ZYX")
    );
    const quaternion = worldQuaternion
      .multiply(cadQuaternion)
      .multiply(baseQuaternion);
    const centerOffset = new THREE.Vector3(
      length / 2,
      -width / 2,
      thickness / 2
    ).applyQuaternion(quaternion);
    position[0] += centerOffset.x;
    position[1] += centerOffset.y;
    position[2] += centerOffset.z;
    return { position, quaternion };
  }, [offset, rotation, size, sourcePosition, type]);

  return (
    <mesh position={position} quaternion={quaternion}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

export default AufmasBoard;
