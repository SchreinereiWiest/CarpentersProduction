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
import { calculateNesting } from './algorythm/nestingAlgorythm.js';
import NestingScene from './nestingscene.project.jsx';
import { defaultSettings } from './algorythm/helper/defaults.js';
import NestingSettingsModal from "./nestingSettingsModal.project.jsx"
import { TOUCH } from "three";

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

    const [loadingGeneratedData, setLoadingGeneratedData] = useState(false);
    const [loadingListData, setLoadingListData] = useState(false);

    const [settings, setSettings] = useState([defaultSettings]);
    const [showSettings, setShowSettings] = useState(false);

    const loadListData = async () => {

            setLoadingListData(true);

            try {

                const response = await axios.get(

                    `/api/projects/generated/${projectId}/list`,

                    {
                        withCredentials: true
                    }

                );

                const {

                    exists,

                    downloadUrl,

                } = response.data;

                // console.log(response.data, "list");


                // Datei existiert bereits
                if (exists) {

                    try {
                        const fileResponse = await fetch(
                            downloadUrl
                        );

                        const data = await fileResponse.json();


                        setProcessedContent(data);                       

                        return data;
                    } catch (error) {
                        console.warn("cant fetch data, try new upload");
                    }

                }

                //datei existiert nicht -> neu erstellen und hochladen
                console.warn("Keine datei vorhanden!");

            } catch (error) {

                console.error(
                    "Generated data konnte nicht geladen werden",
                    error
                );

            } finally {

                setLoadingListData(false);

            }

        };

    async function createdata(userSettings) {
        if (!projectId) {
            return;
        }

        const processedData = await loadListData();

        if (!processedData) return;

        // 3. Wieder mit der lokalen Variable weiterarbeiten
        const nestingData = calculateNesting(processedData, userSettings);
        nestingData.forEach((plate, index) => {
            setSettings(prev => {
                const newSettings = [...prev];

                newSettings[index] = {
                    ...newSettings[index],
                    ...plate.settings
                };
                return newSettings;
            });
        });
        
        setNestingResult(nestingData);


        return nestingData;
    }

    async function UploadData() {
        // Datei existiert nicht
                const generatedData = await createdata(settings);
                
                setNestingResult(generatedData);

                if (!generatedData) return;

                const response = await axios.post(
                    `/api/projects/generated/${projectId}/nesting`,
                    generatedData,
                    {
                        withCredentials: true,
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                );

                console.log("Upload response:", response.data);

            }


    useEffect(() => {
        const fetchProject = async () => {
            const { data } = await axios.get(`/api/projects/get/${projectId}`);
            const projectData = data.project;
            setProject(data.project);

            const customerdata = await axios.get(`/api/customers/get/${data.project.customerId}`);
            setCustomer(customerdata.data.customer);

        };

        fetchProject();
    }, [projectId]);


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


                // Datei existiert bereits
                if (exists) {

                    try {
                        const fileResponse = await fetch(
                            downloadUrl
                        );

                        const data = await fileResponse.json();


                        setNestingResult(data);

                        setSettings(prev => {
                            const newSettings = [...prev];

                            data.forEach((sheet, index) => {
                                newSettings[index] = {
                                    ...defaultSettings,
                                    ...sheet.settings
                                };
                            });

                            return newSettings;
                        });

                        return;
                    } catch (error) {
                        console.warn("cant fetch data, try new upload");
                    }

                }

                //datei existiert nicht -> neu erstellen un hochladen
                await UploadData();


            } catch (error) {

                console.error(
                    "Generated data konnte nicht geladen werden",
                    error
                );

            } finally {

                const processedData = await loadListData();

                if (!processedData) return;

                setContent(processedData);

                setLoadingGeneratedData(false);

            }


        };


        loadGeneratedData();

        

    }, [projectId, project]);


    const [activeSheetIndex, setActiveSheetIndex] = useState(0);
    const activeSheet = nestingResult?.[activeSheetIndex];

    const [activeStrip, setActiveStrip] = useState({});

    // console.log(content);

    return (
    <div className="bg-gray-900 text-white h-screen flex overflow-hidden">

    <SideBar selected={2} />

    <main className="flex-1 flex flex-col overflow-hidden">

        {/* bleibt immer oben */}
        <div className="sticky top-0 z-20 bg-gray-900 border-b border-gray-700">
            <ProjectBar selected={4} />
        </div>

            {/* Content-Bereich */} <div className="relative flex-1 overflow-hidden"> {/* Navigation der Hauptplatten
                */} <div className="absolute xl:top-4 top-2 xl:left-4 left-2 xl:right-4 right-2 z-20">
                    <div className="bg-gray-800/95 backdrop-blur border border-gray-700 rounded-xl shadow-xl xl:p-3 p-2">
                        <div className="flex items-center xl:gap-3 gap-2">
                            <div className="xl:text-sm text-xs text-gray-400 whitespace-nowrap"> Hauptplatten </div>
                            <div className="flex gap-2 overflow-x-auto"> {nestingResult?.map( (sheetPlate, index) => {
                                const
                                isActive = index === activeSheetIndex; return ( <button key={index} onClick={()=>
                                    setActiveSheetIndex( index ) } className={` flex items-center xl:gap-3 gap-2 xl:px-4 px-2 xl:py-2 py-1
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

                {activeSheet && ( <div className="absolute xl:top-24 xl:left-4 top-17 left-2 z-20">
                    <div className="bg-gray-800/90 backdrop-blur border border-gray-700 rounded-lg xl:px-4 px-2 py-3 shadow-lg">
                        <div className="text-xs text-gray-400 mb-1"> Aktive Hauptplatte </div>
                        <div className="font-semibold text-white xl:text-md text-sm"> Platte #{activeSheetIndex + 1} </div>
                        <div className="xl:text-sm text-xs text-gray-400 mt-1"> {activeSheet.MID} </div>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500"> <span>
                                {activeSheet.nestingPlates?.length ?? 0} {""}Nesting-Platten </span>
                            <span> {activeSheet.strips?.length ?? 0} {" "}Strips </span>
                        </div>
                    </div>
                </div> )}

                {activeStrip && ( <div className="absolute xl:top-56 xl:left-4 top-47 left-2 z-20">
                    <div className="bg-gray-800/90 backdrop-blur border border-gray-700 rounded-lg xl:px-4 px-2 py-3 shadow-lg">
                        <div className="text-gray-400 mb-1"><span className="xl:text-sm text-xs"> Aktiver Strip</span> <span className="ml-8 font-semibold text-white xl:text-l text-sm">{activeStrip.id}</span></div>
                        <div className="font-semibold text-white xl:text-lg text-sm"> {activeStrip.placedWidth} x {activeStrip.placedHeight} </div>
                        {activeStrip?.plates?.map((plate, index) => (
                        <div className="flex gap-4 mt-2 xl:text-lm text-sm text-gray-500" key={plate.id}> <span> {plate.originalWidth} x {plate.originalHeight} | {plate.original.Objektname} </span> </div>
                        ))}
                        <div className="text-gray-500 xl:text-lm text-sm pt-1"> Rest: {activeStrip.remainingHeight} </div>
                    </div>

                </div> )}

                <div className="absolute xl:top-24 top-17 right-4 z-20">
    <div className="
        flex
        items-center
        xl:gap-3 gap-2
        bg-gray-800/90
        backdrop-blur
        border
        border-gray-700
        rounded-lg
        xl:px-4 px-2
        xl:py-3 py-1
        shadow-lg
    ">

        <button
            onClick={() => setShowSettings(true)}
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
            Einstellungen
        </button>

        <button
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
            onClick={UploadData}
        >
            <span className="xl:font-medium">
                Update
            </span>
        </button>

    </div>
</div>

                {( <div className="absolute xl:top-44 top-30 right-4 z-20">
                    <div className="bg-gray-800/90 backdrop-blur border border-gray-700 rounded-lg xl:px-4 px-2 xl:py-3 py-1 shadow-lg">
                        <div className="text-gray-400 mb-1"><span className="text-sm"> Legende: </span> </div>
                        
                        {content?.map((list, index) => (
                            
                        <div className="flex gap-4 xl:mt-2 mt-1 xl:text-lm text-sm text-white" key={list.PID}> 
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-4 h-4 rounded-sm"
                                    style={{ backgroundColor: list.color }}
                                />

                                <span>
                                    {list.Objektname}
                                </span>
                            </div>
                        </div>
                        ))}
                    </div>

                </div> )}

                {showSettings && (

                    <NestingSettingsModal
                        settings={settings[activeSheetIndex]}
                        activeSheet={activeSheetIndex}
                        setSettings={setSettings}
                        onClose={() => setShowSettings(false)}
                    />

                )}

                <div className="absolute inset-0">
                    <Canvas orthographic camera={{ zoom: 6, position: [0, 0, 2] }}>
                        <group scale={[0.01,-0.01,0.01]} position={[-75, 9,0]}>
                            <NestingScene result={activeSheet} setActiveStrip={setActiveStrip}
                                activeStrip={activeStrip} settings={settings}/>
                        </group>

                        <OrbitControls
    enableRotate={false}
    enablePan={true}
    enableZoom={true}
    mouseButtons={{
        LEFT: MOUSE.PAN,
        MIDDLE: MOUSE.DOLLY,
        RIGHT: MOUSE.PAN,
    }}
    touches={{
        ONE: TOUCH.PAN,
        TWO: TOUCH.DOLLY_PAN,
    }}
/>

                    </Canvas>

                </div>
            </div>

    </main>

</div>);
}
export default NestingView