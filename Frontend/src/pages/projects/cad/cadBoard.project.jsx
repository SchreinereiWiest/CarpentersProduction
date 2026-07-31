import React from "react";
import axios from "axios";
import queryString from "query-string";
import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from "three";
// import { useControls } from 'leva'

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader'
import { useControls } from 'leva'

// Schreinerplatte cad parsing

function Board(props) {
  // This reference gives us direct access to the THREE.Mesh object
  const ref = useRef()
  // Hold state for hovered and clicked events


  const position = [...props.position];

  let baseQuaternion = new THREE.Quaternion();

  let L = props.size[0];
  let B = props.size[1];
  let T = props.size[2];

  const RX = ((props.urotation[0] * Math.PI) / 180);
  const RY = ((props.urotation[1] * Math.PI) / 180);
  const RZ = ((props.urotation[2] * Math.PI) / 180);

  const OX = (props.offset[0]);
  const OY = (props.offset[1]);
  const OZ = (props.offset[2]);

  let cX = position[0];
  let cY = position[1];
  let cZ = position[2];

  if (OX<0) {
    if (L/OX===-1) {
      L*=-1;
    } else if (B/OX===-1) {
      B*=-1;
    } else if (T/OX===-1) {
      T*=-1
    }
  }

  if (OY<0) {
    if (L/OY===-1) {
      L*=-1;
    } else if (B/OY===-1) {
      // B*=-1;
    } else if (T/OY===-1) {
      T*=-1;
    }
  }

  if (OZ<0) {
    if (L/OZ===-1) {
      L*=-1;
    } else if (B/OZ===-1) {
      B*=-1;
    } else if (T/OZ===-1) {
      T*=-1;
    }
  }


  if (props.type === "Deckel" || props.type === "Boden") {
    baseQuaternion.setFromEuler(
        new THREE.Euler(0, 0, 0)
      );

      T*=-1;
  }
  else if (
    props.type === "Seite links") { 
      baseQuaternion.setFromEuler(
        new THREE.Euler(0, Math.PI/2, 0)
      );
    }
    else if (props.type === "Seite rechts") { 
      baseQuaternion.setFromEuler(
        new THREE.Euler(0, Math.PI/2, 0)
      );}
    else if (props.type === "RW") { 
      baseQuaternion.setFromEuler(
        new THREE.Euler(-Math.PI/2,0, Math.PI/2)
      );
      
    }
    else if (props.type === "FR" || props.type === "Front") {
      baseQuaternion.setFromEuler(
        new THREE.Euler(-Math.PI/2,0, Math.PI/2)
      );
      
     } else if (props.type === "Sockel") { 
      baseQuaternion.setFromEuler(
        new THREE.Euler(Math.PI/2,0, 0)
      );
      T *=-1;
    }
    else {

      baseQuaternion.setFromEuler(
        new THREE.Euler(0, 0, 0)
        
      );
      T*=-1;
    }

  const cadQuaternion = new THREE.Quaternion();
  const finalQuaternion = new THREE.Quaternion();
  const worldQuaternion = new THREE.Quaternion();

  worldQuaternion.setFromEuler(
  new THREE.Euler(
    Math.PI/2,
    0,
    0
  )
);

  cadQuaternion.setFromEuler(
    new THREE.Euler(-RX, -RY, RZ, 'ZYX')
  );

  finalQuaternion.copy(worldQuaternion);
  
  finalQuaternion.multiply(cadQuaternion);

  finalQuaternion.multiply(baseQuaternion);

  const centerOffset = new THREE.Vector3(
    L / 2, -B / 2, T / 2

  );

  centerOffset.applyQuaternion(finalQuaternion);

  position[0] = cX +  centerOffset.x;
  position[1] = cY +  centerOffset.y;
  position[2] = cZ +  centerOffset.z;

  // console.log(position[1], props.position[1], centerOffset.y);

  // position[0] *= -1;
  return (
   <group>
  <mesh {...props} ref={ref} position={position} quaternion={finalQuaternion}>

    <boxGeometry args={props.size} />
    <meshStandardMaterial color={props.color} />

  </mesh>
  
</group>
    
  )
}

export default Board;