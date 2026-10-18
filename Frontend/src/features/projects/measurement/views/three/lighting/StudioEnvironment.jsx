import { useEffect, useMemo } from "react";
import { Environment } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { ENVIRONMENT_INTENSITY } from "./lightingConfig.js";

export default function StudioEnvironment() {
  const { gl } = useThree();
  const environmentMap = useMemo(() => {
    const environmentScene = new RoomEnvironment();
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    const texture = pmremGenerator.fromScene(environmentScene, 0.04).texture;

    environmentScene.dispose();
    pmremGenerator.dispose();
    return texture;
  }, [gl]);

  useEffect(() => {
    return () => environmentMap.dispose();
  }, [environmentMap]);

  return (
    <Environment
      map={environmentMap}
      background={false}
      environmentIntensity={ENVIRONMENT_INTENSITY}
    />
  );
}
