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


    // console.log(processedContent);

    return (
    <div className="bg-gray-900 text-white h-screen flex overflow-hidden">

    <SideBar selected={2} />

    <main className="flex-1 flex flex-col overflow-hidden">

        {/* bleibt immer oben */}
        <div className="sticky top-0 z-20 bg-gray-900 border-b border-gray-700">
            <ProjectBar selected={4} />
        </div>

        {/* nur dieser Bereich scrollt */}
         <div className="relative h-[90vh]">

    <div className="absolute inset-0">
            <Canvas orthographic camera={{ zoom: 6, position: [0, 0, 2] }}>
                <group scale={[0.01,-0.01,0.01]} position={[-75,-10,0]}>
                    <NestingScene result={nestingResult} />
                </group>
                

                <OrbitControls />

            </Canvas>

        </div>
        </div>

    </main>

</div>);
}

export default NestingView