import { Suspense, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader";
import { getProjectAssetUrl } from "../../../services/projectAssetCache.js";
import { loadCadFile } from "./cadLoader.project.js";
import AufmasBoard from "./aufmasBoard.project.jsx";

const DEFAULT_LIGHT_DIRECTION = 37;
const DEFAULT_LIGHT_STRENGTH = 2.6;

function CadGroup({ parent, selected, onSelect }) {
    const [hovered, setHovered] = useState(false);
    const children = parent.Children?.filter(item => item.BPID?.trim()) ?? [];
    const items = children.length ? children : [parent];
    const color = selected?.PID === parent.PID ? "#60a5fa" : hovered ? "#93c5fd" : "#d59a4e";

    return (
        <group
            onPointerOver={event => { event.stopPropagation(); setHovered(true); }}
            onPointerOut={() => setHovered(false)}
            onPointerDown={event => { event.stopPropagation(); onSelect(parent); }}
        >
            {items.map(item => (
                <AufmasBoard
                    key={item.PID}
                    size={[item.L / 10, item.B / 10, item.T / 10]}
                    position={[item.X, item.Z, item.Y]}
                    type={item.Plattentyp}
                    offset={[item.OX, item.OY, item.OZ]}
                    rotation={[item.RX, item.RY, item.RZ]}
                    color={color}
                />
            ))}
        </group>
    );
}

function GlbModel({ url }) {
    const gltf = useLoader(GLTFLoader, url);

    useLayoutEffect(() => {
        gltf.scene.traverse(object => {
            if (!object.isMesh) return;
            object.castShadow = true;
            object.receiveShadow = true;
        });
    }, [gltf.scene]);

    return <primitive object={gltf.scene} scale={100} />;
}

function StudioEnvironment() {
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
            environmentIntensity={0.28}
        />
    );
}

export default function AufmasThreeView({ files = [] }) {
    const [content, setContent] = useState([]);
    const [glbUrl, setGlbUrl] = useState("");
    const [selected, setSelected] = useState(null);
    const [lightDirection, setLightDirection] = useState(DEFAULT_LIGHT_DIRECTION);
    const [lightStrength, setLightStrength] = useState(DEFAULT_LIGHT_STRENGTH);
    const glbFile = useMemo(() => files.find(file => file.fileName?.toLowerCase().endsWith(".glb")), [files]);
    const jsonFile = useMemo(() => files.find(file => file.fileName?.toLowerCase().endsWith(".json") && file.fileName?.startsWith("Planung")), [files]);
    const { keyLightPosition, fillLightPosition } = useMemo(() => {
        const angle = THREE.MathUtils.degToRad(lightDirection);
        const horizontalX = Math.cos(angle);
        const horizontalZ = Math.sin(angle);

        return {
            keyLightPosition: [horizontalX * 10, 12, horizontalZ * 10],
            fillLightPosition: [-horizontalX * 8, 5, -horizontalZ * 8],
        };
    }, [lightDirection]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (glbFile) {
                const url = await getProjectAssetUrl(glbFile);
                if (!cancelled) setGlbUrl(url);
            } else if (jsonFile) {
                const parsed = await loadCadFile(jsonFile);
                if (!cancelled) setContent(parsed);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [glbFile, jsonFile]);

    if (!glbFile && !jsonFile) {
        return (
            <div className="flex h-full flex-col items-center justify-center bg-[#111820] px-8 text-center">
                <div className="mb-4 rounded-2xl border border-[#33404d] bg-[#19232d] p-5 text-[#77a8d8]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-10"><path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5V16l-8 5-8-5V7.5Z"/></svg>
                </div>
                <p className="font-medium text-[#dbe5ee]">Kein 3D-Modell vorhanden</p>
                <p className="mt-2 max-w-sm text-sm text-[#7f8d99]">Eine GLB- oder Planung.json-Datei kann in den Projekteinstellungen ergänzt werden.</p>
            </div>
        );
    }

    return (
        <div className="relative h-full bg-[#111820]">
            <Canvas
                shadows
                dpr={[1, 2]}
                camera={{ position: [8, 7, 10], fov: 42 }}
                gl={{
                    antialias: true,
                    outputColorSpace: THREE.SRGBColorSpace,
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 0.78,
                }}
            >
                <color attach="background" args={["#111820"]} />
                <StudioEnvironment />
                <ambientLight intensity={0.025} />
                <hemisphereLight args={["#dcecff", "#241b14", 0.12]} />
                <directionalLight
                    castShadow
                    color="#f6d6ad"
                    position={keyLightPosition}
                    intensity={lightStrength}
                    shadow-mapSize-width={2048}
                    shadow-mapSize-height={2048}
                    shadow-camera-near={0.1}
                    shadow-camera-far={50}
                    shadow-camera-left={-12}
                    shadow-camera-right={12}
                    shadow-camera-top={12}
                    shadow-camera-bottom={-12}
                    shadow-bias={-0.00015}
                    shadow-normalBias={0.015}
                    shadow-radius={3}
                />
                <directionalLight
                    color="#cfe3ff"
                    position={fillLightPosition}
                    intensity={lightStrength * 0.06}
                />
                <Suspense fallback={null}>
                    {glbUrl ? (
                        <group scale={[0.01, 0.01, 0.01]}><GlbModel url={glbUrl} /></group>
                    ) : (
                        <group scale={[-0.01, 0.01, 0.01]}>
                            {content.map(parent => <CadGroup key={parent.PID} parent={parent} selected={selected} onSelect={setSelected} />)}
                        </group>
                    )}
                    <ContactShadows
                        position={[0, -0.015, 0]}
                        color="#05080b"
                        opacity={0.7}
                        scale={30}
                        blur={1.8}
                        far={18}
                        resolution={1024}
                        frames={1}
                    />
                </Suspense>
                <gridHelper args={[20, 20, "#36516b", "#263746"]} />
                <OrbitControls makeDefault />
            </Canvas>
            <div
                className="absolute right-4 top-4 w-56 rounded-xl border border-[#3a4b5b] bg-[#131c24]/95 p-3 text-xs text-[#9aabb9] shadow-xl backdrop-blur-sm"
                onPointerDown={event => event.stopPropagation()}
            >
                <div className="mb-3 flex items-center justify-between">
                    <p className="font-medium text-[#e6edf3]">Lichteinstellungen</p>
                    <button
                        type="button"
                        className="rounded px-1.5 py-1 text-[11px] text-[#77a8d8] transition hover:bg-[#263746] hover:text-[#a9cff1]"
                        onClick={() => {
                            setLightDirection(DEFAULT_LIGHT_DIRECTION);
                            setLightStrength(DEFAULT_LIGHT_STRENGTH);
                        }}
                    >
                        Zurücksetzen
                    </button>
                </div>
                <label className="block">
                    <span className="mb-1.5 flex justify-between">
                        <span>Richtung</span>
                        <span className="tabular-nums text-[#dbe5ee]">{lightDirection}°</span>
                    </span>
                    <input
                        type="range"
                        min="-180"
                        max="180"
                        step="1"
                        value={lightDirection}
                        aria-label="Lichtrichtung"
                        className="h-1.5 w-full cursor-pointer accent-[#77a8d8]"
                        onChange={event => setLightDirection(Number(event.target.value))}
                    />
                </label>
                <label className="mt-3 block">
                    <span className="mb-1.5 flex justify-between">
                        <span>Stärke</span>
                        <span className="tabular-nums text-[#dbe5ee]">{lightStrength.toFixed(1)}</span>
                    </span>
                    <input
                        type="range"
                        min="0.2"
                        max="5"
                        step="0.1"
                        value={lightStrength}
                        aria-label="Lichtstärke"
                        className="h-1.5 w-full cursor-pointer accent-[#77a8d8]"
                        onChange={event => setLightStrength(Number(event.target.value))}
                    />
                </label>
            </div>
            {selected && (
                <div className="absolute bottom-4 left-4 rounded-xl border border-[#3a4b5b] bg-[#17212b]/95 px-4 py-3 shadow-xl">
                    <p className="text-xs uppercase tracking-[0.14em] text-[#708292]">Ausgewählter Korpus</p>
                    <p className="mt-1 font-medium text-[#e6edf3]">{selected.Objektname || selected.PID}</p>
                    <p className="mt-1 text-xs text-[#91a1af]">{selected.L} × {selected.B} × {selected.T} mm</p>
                </div>
            )}
        </div>
    );
}
