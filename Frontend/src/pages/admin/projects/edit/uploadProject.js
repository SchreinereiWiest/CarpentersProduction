import { useState } from 'react'
import axios from 'axios';
import { useNavigate } from 'react-router';
import { useParams } from 'react-router';


export async function ProjectSave(corpuses, materials, selectedCustomer, files, projectDescription, projectName) {


    let cadData = null;
    console.log(corpuses);

    let pid = 0;

    const nextPID = () => {
        pid++;
        return pid.toString().padStart(6, "0");
    };

    const getMaterial = (id) =>
        materials.find(m => m.id === id);

    const createEdgeString = (plate) => {

        const edge = edge =>
            edge && edge !== "Standardmaterial"
                ? "000"
                : "";

        return `${edge(plate.ELID)}:${edge(plate.ERID)}:${edge(plate.ETID)}:${edge(plate.EBID)}`;
    };

    cadData = corpuses.map(corpus => {

        const corpusMaterial = getMaterial(corpus.MID);

        return {

            PID: nextPID(),

            BPID: "",

            Objektname: corpus.name,

            Plattentyp: "KO",

            Anzahl: Number(corpus.quantity),

            L: Number(corpus.height),

            B: Number(corpus.width),

            T: Number(corpus.depth),

            MID: corpusMaterial?.materialNumber ?? "",

            Maserung: corpusMaterial?.maser ? "Ja" : "",

            ELID: "",

            ERID: "",

            ETID: "",

            EBID: "",

            Kante: ":::",

            Notiz: "",

            Children: corpus.Children.map(child => {

                const material = getMaterial(child.MID);

                const plate = {

                    PID: nextPID(),

                    BPID: "Nein",

                    Objektname: child.name,

                    Plattentyp: child.type,

                    Anzahl: Number(child.quantity),

                    L: Number(child.height),

                    B: Number(child.width),

                    T: Number(child.depth),

                    MID: material?.materialNumber ?? "",

                    Maserung: material?.maser ? "Ja" : "",

                    ELID: child.ELID ?? "",

                    ERID: child.ERID ?? "",

                    ETID: child.ETID ?? "",

                    EBID: child.EBID ?? "",

                    Notiz: "",

                    color:
                        "#" +
                        Math.floor(Math.random() * 16777215)
                            .toString(16)
                            .padStart(6, "0")

                };

                plate.Kante = createEdgeString(plate);

                return plate;

            })

        };

    });

    console.log(cadData);

    //Upload Project

    const project = await axios.post("/api/projects/new", {
                customerId: selectedCustomer.id,
                title: projectName,
                description: projectDescription
            },
                {
                    withCredentials: true
                });
    
    for (const file of files) {
                let mimeType = file.type;
    
                if (mimeType == "" | !mimeType) {
    
                    const extension = file.name.split(".").pop().toLowerCase();
    
                    switch (extension) {
    
                        case "glb":
                            mimeType = "model/gltf-binary";
                            break;
    
                        case "gltf":
                            mimeType = "model/gltf+json";
                            break;
                    }
                }
                
                const response = await axios.post("/api/files/upload-url",
                {
                    entityId: project.data.id,
                    customerId: selectedCustomer.id,
                    entity: "project",
                    fileName: file.name,
                    mimeType: mimeType,
                    fileSize: file.size
                });
    
                console.log("Upload URL:", response.data.uploadUrl);
    
                const s3response = await axios.put(
                    response.data.uploadUrl,
                    file,
                    {
                        headers:{
                            "Content-Type": file.type
                        }
                    }
                );
                
                console.log(response.data.fileEntry.id);
    
                await axios.post(`/api/files/complete/`, {
                        id: response.data.fileEntry.id
                    }
            );
            }

        const generatedData = cadData;
                        
                        if (!generatedData) return;
        
                        // Datei beim Backend erstellen
                        const postResponse =
                            await axios.post(
        
                                `/api/projects/generated/${project.data.id}/list`,
                                {
                                },
        
                                {
                                    withCredentials: true
                                }
        
                            );
        
                        const jsonContent = JSON.stringify(generatedData);
        
                        console.log(postResponse.data);
        
                        const s3response = await axios.put(
                            postResponse.data.uploadUrl,
                            jsonContent,
                            {
                                headers: {
                                    "Content-Type": jsonContent.type
                                }
                            }
                        );

}