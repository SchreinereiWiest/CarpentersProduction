import React, { Children, useEffect, useRef, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate, useParams } from 'react-router';

import SideBar from "../../../../components/sideBar.jsx";
import Board from "./cadBoard.project.jsx";
import EditorPanel from "./cadPanel.project.jsx";
import ProjectBar from "../../../../components/projectBar.jsx";
import { loadCadFile } from "./cadLoader.project.js";

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useControls } from 'leva'
import * as THREE from "three";


function GroupObject({ parent, selected, setSelected }) {

  const [hovered, hover] = useState(false)

  const hasChildren =
    parent.Children &&
    parent.Children.length > 0;

  const isSelected = selected?.PID === parent.PID;

  return (

    <group onPointerOver={(event) => (event.stopPropagation(), hover(true))} onPointerOut={(event) => hover(false)} onPointerDown={(e) => {
  e.stopPropagation();
  setSelected(parent);
  
}}>

      {hasChildren ? (parent.Children.filter(item => item.BPID && item.BPID.trim() !== "").map(item => (
        <Board key={item.PID} size={[item.L / 10, item.B / 10, item.T / 10]} position={[item.X / 1, item.Z / 1,
        item.Y / 1]} type={item.Plattentyp} offset={[item.OX, item.OY, item.OZ]} urotation={[item.RX, item.RY,
        item.RZ]} color={isSelected ? 'red' : hovered ? 'hotpink' : 'orange'} />
      ))) : (<Board key={parent.PID} size={[parent.L / 10, parent.B / 10, parent.T / 10]} position={[parent.X / 1, parent.Z / 1,
      parent.Y / 1]} type={parent.Plattentyp} offset={[parent.OX, parent.OY, parent.OZ]} urotation={[parent.RX, parent.RY,
      parent.RZ]} color={isSelected ? 'red' : hovered ? 'hotpink' : 'orange'} />)}

    </group>

  );

}

function GLBModel({ url }) {

    if(!url) return;
    const gltf = useLoader(
        GLTFLoader,
        url
    );

    return (
        <primitive
            object={gltf.scene}
            scale={100}
        />
    );
}


function CadViewer() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [content, setContent] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  const [cadfiles, setcadfiles] = useState([]);
  const [glbUrl, setGlbUrl] = useState(null);
  
  const [project, setProject] = useState(null);
  const [customer, setCustomer] = useState(null);
  
  const [loader, setLoader] = useState(null);
  const [availableLoaders, setAvailableLoaders] = useState([]);


  useEffect(() => {
    //fetch project data
    const fetchProject = async () => {
    const { data } = await axios.get(`/api/projects/get/${projectId}`);
    setProject(data.project);

    //fetch customer data
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

    if(!loader) {

        const hasJson = cadFiles.some(file =>
        file.fileName.toLowerCase().endsWith(".json")
        );

        const hasGlb = cadFiles.some(file =>
            file.fileName.toLowerCase().endsWith(".glb")
        );

        const loaders = [];

        if(hasGlb) {
            loaders.push("gltf");
        }

        if(hasJson) {
            loaders.push("json");
        }

        setAvailableLoaders(loaders);
        setLoader(loaders[0] ?? null);
  }

    if (!loader || !cadFiles.length) {
        return;
    }


const load = async () => {
        if (loader === "json") {
            const jsonFile = cadFiles.find(file =>
                file.fileName
                    .toLowerCase()
                    .endsWith(".json")
            );

            if (!jsonFile) return;

            const result = await loadCadFile(jsonFile);
            setContent(result);
        }

        if (loader === "gltf") {

            const glbFile = cadFiles.find(file =>
                file.fileName
                    .toLowerCase()
                    .endsWith(".glb")
            );

            if (!glbFile) return;

            const response = await axios.get(
                `/api/files/download/${glbFile.id}`,
                {
                    withCredentials:true
                }
            );

            setGlbUrl(
                response.data.url
            );
        }
    };
    load();


}, [loader, project]);


return (<div className='bg-gray-900 text-white justify-left h-screen overflow-hidden flex'>

<SideBar selected={2} />

<main className="flex-1 overflow-y-auto">

  <ProjectBar selected={1} />

  <div className="relative h-[90vh]">

    <div className="absolute inset-0">

      <Canvas>
        <ambientLight intensity={Math.PI / 2} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
        <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />

        <group scale={[-0.01,0.01,0.01]}>

          {loader === "json" ? (
          content.map(parent => (
          <GroupObject key={parent.PID} parent={parent} selected={selectedParent} setSelected={setSelectedParent} />
          ))
          ) : (
          <GLBModel url={glbUrl} />
          )}

        </group>

        <gridHelper args={[20, 20, 0xff0000, 'teal' ]} />

        <OrbitControls />
      </Canvas>

    </div>

    {loader == "gltf" ?
    <div /> :
    <div className="absolute z-1 p-4">
      <EditorPanel selectedParent={selectedParent} setSelectedParent={setSelectedParent} />
    </div>}

    <div className="absolute z-1 p-4 bottom-1">
      <button onClick={()=> setLoader("json")} className="m-2 bg-gray-700 text-white rounded-full h-12 w-full mx-4 flex
        items-center justify-center hover:bg-gray-600 transition duration-300">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
          <path fillRule="evenodd"
            d="M11.622 1.602a.75.75 0 0 1 .756 0l2.25 1.313a.75.75 0 0 1-.756 1.295L12 3.118 10.128 4.21a.75.75 0 1 1-.756-1.295l2.25-1.313ZM5.898 5.81a.75.75 0 0 1-.27 1.025l-1.14.665 1.14.665a.75.75 0 1 1-.756 1.295L3.75 8.806v.944a.75.75 0 0 1-1.5 0V7.5a.75.75 0 0 1 .372-.648l2.25-1.312a.75.75 0 0 1 1.026.27Zm12.204 0a.75.75 0 0 1 1.026-.27l2.25 1.312a.75.75 0 0 1 .372.648v2.25a.75.75 0 0 1-1.5 0v-.944l-1.122.654a.75.75 0 1 1-.756-1.295l1.14-.665-1.14-.665a.75.75 0 0 1-.27-1.025Zm-9 5.25a.75.75 0 0 1 1.026-.27L12 11.882l1.872-1.092a.75.75 0 1 1 .756 1.295l-1.878 1.096V15a.75.75 0 0 1-1.5 0v-1.82l-1.878-1.095a.75.75 0 0 1-.27-1.025ZM3 13.5a.75.75 0 0 1 .75.75v1.82l1.878 1.095a.75.75 0 1 1-.756 1.295l-2.25-1.312a.75.75 0 0 1-.372-.648v-2.25A.75.75 0 0 1 3 13.5Zm18 0a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-.372.648l-2.25 1.312a.75.75 0 1 1-.756-1.295l1.878-1.096V14.25a.75.75 0 0 1 .75-.75Zm-9 5.25a.75.75 0 0 1 .75.75v.944l1.122-.654a.75.75 0 1 1 .756 1.295l-2.25 1.313a.75.75 0 0 1-.756 0l-2.25-1.313a.75.75 0 1 1 .756-1.295l1.122.654V19.5a.75.75 0 0 1 .75-.75Z"
            clipRule="evenodd" />
        </svg>

      </button>

      <button onClick={()=> setLoader("gltf")} className="bg-gray-700 text-white rounded-full h-12 w-full mx-4 flex
        items-center justify-center hover:bg-gray-600 transition duration-300">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
          <path
            d="M12.378 1.602a.75.75 0 0 0-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03ZM21.75 7.93l-9 5.25v9l8.628-5.032a.75.75 0 0 0 .372-.648V7.93ZM11.25 22.18v-9l-9-5.25v8.57a.75.75 0 0 0 .372.648l8.628 5.033Z" />
        </svg>

      </button>
    </div>

  </div>

</main>
</div>
);
}

export default CadViewer;