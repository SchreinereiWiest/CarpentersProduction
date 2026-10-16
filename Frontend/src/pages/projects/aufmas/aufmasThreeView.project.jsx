import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader";
import { getProjectAssetUrl } from "../../../services/projectAssetCache.js";
import { loadCadFile } from "./cadLoader.project.js";
import AufmasBoard from "./aufmasBoard.project.jsx";

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
    return <primitive object={gltf.scene} scale={100} />;
}

export default function AufmasThreeView({ files = [] }) {
    const [content, setContent] = useState([]);
    const [glbUrl, setGlbUrl] = useState("");
    const [selected, setSelected] = useState(null);
    const glbFile = useMemo(() => files.find(file => file.fileName?.toLowerCase().endsWith(".glb")), [files]);
    const jsonFile = useMemo(() => files.find(file => file.fileName?.toLowerCase().endsWith(".json") && file.fileName?.startsWith("Planung")), [files]);

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
            <Canvas camera={{ position: [8, 7, 10], fov: 42 }}>
                <color attach="background" args={["#111820"]} />
                <ambientLight intensity={1.6} />
                <directionalLight position={[8, 12, 6]} intensity={2.4} />
                <directionalLight position={[-8, 4, -6]} intensity={0.8} />
                <Suspense fallback={null}>
                    {glbUrl ? (
                        <group scale={[1, 1, -1]}><GlbModel url={glbUrl} /></group>
                    ) : (
                        <group scale={[-0.01, 0.01, 0.01]}>
                            {content.map(parent => <CadGroup key={parent.PID} parent={parent} selected={selected} onSelect={setSelected} />)}
                        </group>
                    )}
                </Suspense>
                <gridHelper args={[20, 20, "#36516b", "#263746"]} />
                <OrbitControls makeDefault />
            </Canvas>
            <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-[#344351] bg-[#131c24]/90 px-3 py-2 text-xs text-[#9aabb9] shadow-xl">
                Ziehen zum Drehen · Scrollen zum Zoomen
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
