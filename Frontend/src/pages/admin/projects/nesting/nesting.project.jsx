import { useState } from 'react'
import SideBar from '../../../../components/sideBar.jsx';
import axios from 'axios';
import { useNavigate } from 'react-router';
import { useParams } from 'react-router';
import { useEffect } from "react";
import { Link } from "react-router";
import ProjectBar from '../../../../components/projectBar.jsx';
import { loadCadFile } from '../cad/cadLoader.project.js';
import { processContent } from '../list/listProcess.project.js';
import { calculateNesting } from './algorythm/nestingAlgorythm.js';
import NestingScene from './nestingscene.project.jsx';

import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useControls } from 'leva'
import * as THREE from "three";
import { MapControls } from "@react-three/drei";
import {MOUSE} from "three";


function NestingView() {
    const navigate = useNavigate();
    const { projectId } = useParams();

    const [project, setProject] = useState(null);
    const [customer, setCustomer] = useState(null);

    const [cadfiles, setcadfiles] = useState([]);
    const [content, setContent] = useState([]);
    const [processedContent, setProcessedContent] = useState();

    const [nestingResult, setNestingResult] = useState();

    useEffect(() => {
        const fetchProject = async () => {
            const { data } = await axios.get(`/api/projects/get/${projectId}`);
            setProject(data.project);

            const customerdata = await axios.get(`/api/customers/get/${data.project.customerId}`);
            setCustomer(customerdata.data.customer);

        };

        fetchProject();
    }, [projectId]);


    useEffect(() => {
        const cadFiles = project?.files?.filter(file =>
            file.fileName?.startsWith("Planung.json") ||
            file.mimeType?.startsWith("model/gltf-binary")
        ) ?? [];

        setcadfiles(cadFiles);

        const load = async () => {

            const jsonFile = cadFiles.find(file =>
                file.fileName
                    .toLowerCase()
                    .endsWith(".json")
            );

            if (!jsonFile) return;

            const result = await loadCadFile(jsonFile);
            setContent(result);

        };
        load();

    }, [project]);

    // console.log(content);

    useEffect(() => {
        if (!content.length) return;

        setProcessedContent(processContent(content));

    }, [content]);

    useEffect(() => {
        if (!processedContent) return;

        const result = calculateNesting(processedContent);

        setNestingResult(result);

    }, [processedContent]);

    const [activeSheetIndex, setActiveSheetIndex] = useState(0);
    const activeSheet = nestingResult?.[activeSheetIndex];

    const [activeStrip, setActiveStrip] = useState({});

    return (
    <div className="bg-gray-900 text-white h-screen flex overflow-hidden">

    <SideBar selected={2} />

    <main className="flex-1 flex flex-col overflow-hidden">

        {/* bleibt immer oben */}
        <div className="sticky top-0 z-20 bg-gray-900 border-b border-gray-700">
            <ProjectBar selected={4} />
        </div>

        {/* <div className="relative h-[90vh]">

            {/* Content-Bereich */} <div className="relative flex-1 overflow-hidden"> {/* Navigation der Hauptplatten
                */} <div className="absolute top-4 left-4 right-4 z-20">
                    <div className="bg-gray-800/95 backdrop-blur border border-gray-700 rounded-xl shadow-xl p-3">
                        <div className="flex items-center gap-3">
                            <div className="text-sm text-gray-400 whitespace-nowrap"> Hauptplatten </div>
                            <div className="h-5 w-px bg-gray-700" />
                            <div className="flex gap-2 overflow-x-auto"> {nestingResult?.map( (sheetPlate, index) => {
                                const
                                isActive = index === activeSheetIndex; return ( <button key={index} onClick={()=>
                                    setActiveSheetIndex( index ) } className={` flex items-center gap-3 px-4 py-2
                                    rounded-lg border transition-all duration-200 whitespace-nowrap ${ isActive ?
                                    "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30" : "bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white" } `} > <span
                                        className="text-xs text-gray-400"> #{index + 1}
                                    </span>
                                    <span className="font-medium"> {sheetPlate.MID} </span> #
                                    <span className="text-xs opacity-70"> {sheetPlate.T} mm </span>
                                </button> ); } )}
                            </div>
                        </div>
                    </div>

                </div>

                {activeSheet && ( <div className="absolute top-24 left-4 z-20">
                    <div className="bg-gray-800/90 backdrop-blur border border-gray-700 rounded-lg px-4 py-3 shadow-lg">
                        <div className="text-xs text-gray-400 mb-1"> Aktive Hauptplatte </div>
                        <div className="font-semibold text-white"> Platte #{activeSheetIndex + 1} </div>
                        <div className="text-sm text-gray-400 mt-1"> {activeSheet.MID} </div>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500"> <span>
                                {activeSheet.nestingPlates?.length ?? 0} {""}Nesting-Platten </span>
                            <span> {activeSheet.strips?.length ?? 0} {" "}Strips </span>
                        </div>
                    </div>
                </div> )}

                {activeStrip && ( <div className="absolute top-56 left-4 z-20">
                    <div className="bg-gray-800/90 backdrop-blur border border-gray-700 rounded-lg px-4 py-3 shadow-lg">
                        <div className="text-xs text-gray-400 mb-1"> Aktiver Strip </div>
                        <div className="font-semibold text-white"> {activeStrip.placedWidth} x {activeStrip.placedHeight} </div>
                        {activeStrip?.plates?.map((plate, index) => (
                        <div className="flex gap-4 mt-2 text-lm text-gray-500"> <span> {plate.originalWidth} x {plate.originalHeight} | {plate.original.Objektname} </span> </div>
                        ))}
                    </div>

                </div> )}

                <div className="absolute inset-0">
                    <Canvas orthographic camera={{ zoom: 6, position: [0, 0, 2] }}>
                        <group scale={[0.01,-0.01,0.01]} position={[-75, 9,0]}>
                            <NestingScene result={activeSheet} setActiveStrip={setActiveStrip}
                                activeStrip={activeStrip} />
                        </group>

                        <OrbitControls enableRotate={false} enablePan={true} enableZoom={true} mouseButtons={{
        LEFT: MOUSE.PAN,
        MIDDLE: MOUSE.DOLLY,
        RIGHT: MOUSE.PAN
    }} />

                    </Canvas>

                </div>
            </div>

    </main>

</div>);
}
export default NestingView