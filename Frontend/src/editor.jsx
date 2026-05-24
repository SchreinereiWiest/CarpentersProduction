import React, { Children } from "react";
import axios from "axios";
import queryString from "query-string";
import SideBar from "./sideBar.jsx";
import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from "three";
import { useMemo } from 'react'

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader'
import { useControls } from 'leva'
import Board from "./editorBoard.jsx";
import EditorPanel from "./editorPanel";


function GroupObject({ parent, selected, setSelected }) {
  console.log(parent);

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



function Editor() {
  const [content, setContent] = useState([]);

  const [selectedParent, setSelectedParent] = useState(null);

  useEffect(() => {
    const load = async () => {
      const res = await axios.get(
        `http://localhost:5000/project/content?id=${queryString.parse(window.location.search).id}&name=CP/Planung.json`
      );

      setContent(res.data);
    };

    load();
  }, []);

  // console.log(content);

  // const gltf = useLoader(GLTFLoader, `http://localhost:5000/project/File?id=${queryString.parse(window.location.search).id}&name=CP/comp.glb`)
return (
<div className='h-max bg-gray-900 text-white justify-left'>

  <SideBar selected={2} />

  <main className="pt-10 h-screen w-full overflow-y-auto pl-25">

    <div className="relative w-full h-full">

      <div className="absolute inset-0">

        <Canvas>
          <ambientLight intensity={Math.PI / 2} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
          <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />

          <group scale={[-0.01,0.01,0.01]}>
            {/* {content.map((item, index) => (
            <Box key={item.PID || index} size={[item.L / 10, item.B / 10, item.T / 10]} position={[item.X / 1, item.Z /
              1, item.Y / 1]} type={item.Plattentyp} offset={[item.OX, item.OY, item.OZ]} urotation={[item.RX, item.RY,
              item.RZ]} />
            ))} */}

            {content.map(parent => (
            <GroupObject key={parent.PID} parent={parent} selected={selectedParent} setSelected={setSelectedParent} />
            ))}

          </group>

          <gridHelper args={[20, 20, 0xff0000, 'teal' ]} />

          <OrbitControls />
        </Canvas>

      </div>

      <div className="absolute z-1">
        <EditorPanel selectedParent={selectedParent} setSelectedParent={setSelectedParent} />
      </div>

    </div>

  </main>
</div>
);
}

export default Editor;