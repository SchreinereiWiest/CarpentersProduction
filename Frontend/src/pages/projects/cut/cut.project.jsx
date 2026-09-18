import { useState } from 'react'
import SideBar from '../../../components/sideBar.jsx';
import axios from 'axios';
import { useNavigate } from 'react-router';
import { useParams } from 'react-router';
import { useEffect } from "react";
import { Link } from "react-router";
import ProjectBar from '../../../components/projectBar.jsx';
import { loadCadFile } from '../cad/cadLoader.project.js';
import { processContent } from '../list/listProcess.project.js';
import { calculateNesting } from "../nesting/algorythm/nestingAlgorythm.js"
import NestingScene from '../nesting/nestingscene.project.jsx';
import { defaultSettings } from '../nesting/algorythm/helper/defaults.js';
import NestingSettingsModal from "../nesting/nestingSettingsModal.project.jsx"
import CutScene from "./cutScene.project.jsx"

import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useControls } from 'leva'
import * as THREE from "three";
import { MapControls } from "@react-three/drei";
import {MOUSE} from "three";

function CutingView() {
    const navigate = useNavigate();
    const { projectId } = useParams();

    const [project, setProject] = useState(null);
    const [customer, setCustomer] = useState(null);

    const [nestingResult, setNestingResult] = useState();

    const [loadingGeneratedData, setLoadingGeneratedData] = useState(false);

    useEffect(() => {

        if (!projectId) {
            return;
        }

        const loadGeneratedData = async () => {

            setLoadingGeneratedData(true);

            try {

                const response = await axios.get(

                    `/api/projects/generated/${projectId}/nesting`,

                    {
                        withCredentials: true
                    }

                );

                const {

                    exists,

                    downloadUrl,

                } = response.data;

                console.log(response.data);


                // Datei existiert bereits
                if (exists) {

                    try {
                        const fileResponse = await fetch(
                            downloadUrl
                        );

                        const data = await fileResponse.json();


                        setNestingResult(data);

                        return;
                    } catch (error) {
                        console.warn("cant fetch data, try new upload");
                    }

                }

                //datei existiert nicht -> neu erstellen un hochladen
                console.warn("data not loaded");


            } catch (error) {

                console.error(
                    "Generated data konnte nicht geladen werden",
                    error
                );

            } finally {

                setLoadingGeneratedData(false);

            }

        };


        loadGeneratedData();

    }, [projectId, project]);

    console.log(nestingResult);

    const [activeSheetIndex, setActiveSheetIndex] = useState(0);
    const activeSheet = nestingResult?.[activeSheetIndex];

    const [activeStrip, setActiveStrip] = useState({});

    const [ShowStripIndex, setShowStripIndex] = useState(0);

return (<div className="bg-gray-900 text-white h-screen flex overflow-hidden">

    <SideBar selected={2} />

    <main className="flex-1 flex flex-col overflow-hidden">

        {/* bleibt immer oben */}
        <div className="sticky top-0 z-20 bg-gray-900 border-b border-gray-700">
            <ProjectBar selected={5} />
        </div>

        <div className="relative flex-1 overflow-hidden"> {/* Navigation der Hauptplatten
                */} <div className="absolute xl:top-4 top-2 xl:left-4 left-2 xl:right-4 right-2 z-20">
                    <div className="bg-gray-800/95 backdrop-blur border border-gray-700 rounded-xl shadow-xl xl:p-3 p-2">
                        <div className="flex items-center xl:gap-3 gap-2">
                            <div className="xl:text-sm text-xs text-gray-400 whitespace-nowrap"> Hauptplatten </div>
                        <div className="h-5 w-px bg-gray-700" />
                        <div className="flex gap-2 overflow-x-auto"> {nestingResult?.map( (sheetPlate, index) => {
                            const
                            isActive = index === activeSheetIndex; return ( <button key={index} onClick={()=> {
                                setActiveSheetIndex( index );
                                setShowStripIndex(0);

                                }} className={` flex items-center xl:gap-3 gap-2 xl:px-4 px-2 xl:py-2 py-1
                                    rounded-lg border transition-all duration-200 whitespace-nowrap ${ isActive ?
                                    "bg-blue-600 border-blue-500 text-white xl:shadow-lg shadow-md shadow-blue-900/30" : "bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white" } `} > <span
                                    className="text-xs text-gray-400"> #{index + 1}
                                </span>
                                <span className="font-medium xl:text-md text-sm"> {sheetPlate.MID} </span> #
                                <span className="text-xs opacity-70"> {sheetPlate.T} mm </span>
                            </button> ); } )}
                        </div>
                    </div>
                </div>

            </div>

            <div className="absolute xl:top-24 top-17 right-4 z-20">
                <div className="
        flex
        items-center
        xl:gap-3 gap-1
        bg-gray-800/90
        backdrop-blur
        border
        border-gray-700
        rounded-lg
        xl:px-4 px-2
        xl:py-3 py-1
        shadow-lg
    ">
                    <span className="
                flex
                items-center
                xl:gap-3 gap-2
                rounded-lg
                border
                border-gray-700
                bg-gray-900
                xl:px-4 px-2
                xl:py-2 py-1
                whitespace-nowrap
                text-gray-400
                transition-all
                
            ">{ShowStripIndex} | {activeSheet?.strips.length - 1}</span>

                    <button onClick={()=> {
                        if (ShowStripIndex > 0) setShowStripIndex(ShowStripIndex - 1);
                        }}
                        className="
                        flex
                        items-center
                        xl:gap-3 gap-2
                        rounded-lg
                        border
                        border-gray-700
                        bg-gray-900
                        xl:px-4 px-2
                        xl:py-2 py-1
                        whitespace-nowrap
                        text-gray-400
                        transition-all
                        duration-200
                        hover:bg-gray-700
                        hover:text-white
                        "
                        >
                        Prev
                    </button>

                    <button onClick={()=> {
                        if(ShowStripIndex < activeSheet.strips.length - 1) { setShowStripIndex(ShowStripIndex + 1);} }}
                            className="
                flex
                items-center
                xl:gap-3 gap-2
                rounded-lg
                border
                border-gray-700
                bg-gray-900
                xl:px-4 px-2
                xl:py-2 py-1
                whitespace-nowrap
                text-gray-400
                transition-all
                duration-200
                hover:bg-gray-700
                hover:text-white
            ">
                            Next
                    </button>

                </div>
            </div>

            <div className="absolute xl:top-24 top-17 xl:left-4 left-2 z-20">
                <div className="bg-gray-800/90 backdrop-blur border border-gray-700 rounded-lg xl:px-4 px-2 xl:py-3 py-1 shadow-lg">
                    <div className="font-semibold text-white"><span className="xl:text-xl text-lm"> Strip {ShowStripIndex}</span>
                    </div>
                    <div className="flex xl:gap-4 gap-2 mt-2 text-xs text-gray-500">

                    </div>
                    <div className="font-semibold text-white xl:mb-4 mb-2 xl:text-xl text-lm"> {activeSheet?.strips[ShowStripIndex].placedWidth} x
                        {activeSheet?.strips[ShowStripIndex].placedHeight} </div>
                    {activeSheet?.strips[ShowStripIndex].plates?.map((plate, index) => (
                    <div className="xl:gap-4 gap-2 xl:mt-2 mt-1 xl:text-lg text-sm text-white" key={plate.id}>
                        <span> {plate.originalHeight} x {plate.originalWidth} | {plate.original.Objektname} </span>

                        <div className="xl:ml-8 ml-4 text-gray-400 text-sm"> Kante Oben: {plate.EdgeT}</div>
                        <div className="xl:ml-8 ml-4 text-gray-400 text-sm"> Kante Rechts: {plate.EdgeR}</div>
                        <div className="xl:ml-8 ml-4 text-gray-400 text-sm"> Kante Links: {plate.EdgeL}</div>
                        <div className="xl:ml-8 ml-4 text-gray-400 text-sm"> Kante Unten: {plate.EdgeB}</div>
                    </div>

                    ))}
                </div>
            </div>

            <div className="absolute inset-0">
                <Canvas orthographic camera={{ zoom: 25, position: [0, 0, 2] }}>
                    <group scale={[0.01,-0.01,0.01]} position={[-5, 11.5,0]}>
                        <CutScene result={activeSheet} stripIndex={ShowStripIndex} />
                    </group>

                    <OrbitControls enableRotate={false} enablePan={false} enableZoom={true} mouseButtons={{
                                                
                                            }} />

                </Canvas>

            </div>

        </div>

    </main>
</div>

);
}

export default CutingView