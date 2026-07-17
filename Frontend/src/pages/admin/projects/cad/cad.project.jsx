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


function CadViewer() {
  const navigate = useNavigate();

  const [content, setContent] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  const [cadfiles, setcadfiles] = useState([]);
  
  const [project, setProject] = useState(null);
  const [customer, setCustomer] = useState(null);
  const { projectId } = useParams();

  useEffect(() => {
    //fetch project data
    const fetchProject = async () => {
    const { data } = await axios.get(`/api/projects/get/${projectId}`);
    setProject(data.project);

    //fetch customer data
    const customerdata = await axios.get(`/api/customers/get/${data.project.customerId}`);
    setCustomer(customerdata.data.customer);

    //filter files + set cad files
    const cadFiles = data.project?.files?.filter(
                    file => file.mimeType?.startsWith("application/")
                );

    setcadfiles(cadFiles);

};

fetchProject();
}, [projectId]);


  useEffect(() => {
    if (!cadfiles.length) return;

    //prepare cad files - functions js lib
    const load = async () => {

        const result = await Promise.all(
            cadfiles.map(loadCadFile)
        );

        setContent(result.flat());
    };

    load();

}, [cadfiles]);



  // const gltf = useLoader(GLTFLoader, `http://localhost:5000/project/File?id=${queryString.parse(window.location.search).id}&name=CP/comp.glb`)
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

            {content.map(parent => (
            <GroupObject key={parent.PID} parent={parent} selected={selectedParent} setSelected={setSelectedParent} />
            ))}

          </group>

          <gridHelper args={[20, 20, 0xff0000, 'teal' ]} />

          <OrbitControls />
        </Canvas>

      </div>

      <div className="absolute z-1 p-4">
        <EditorPanel selectedParent={selectedParent} setSelectedParent={setSelectedParent} />
      </div>

    </div>

  </main>
</div>
);
}

export default CadViewer;