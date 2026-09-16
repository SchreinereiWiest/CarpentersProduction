import { useState } from 'react'
import axios from 'axios';
import { useNavigate } from 'react-router';
import { useParams } from 'react-router';


export async function ProjectSave(corpuses, materials, selectedCustomer, files, projectDescription, projectName, mode, id) {

    if (selectedCustomer == null) {
        console.warn("No customer selected");
        selectedCustomer = {id: "1a87d110-bb96-4af3-9bc5-c0753e1fdadc"}
    }
    let cadData = null;
    console.log(corpuses);

    let pid = 0;

    const nextPID = () => {
        pid++;
        return pid.toString().padStart(6, "0");
    };

    const getMaterial = (id) =>
        materials.find(m => m.id === id);

    console.log(corpuses);
    cadData = corpuses.map(corpus => {

        const corpusMaterial = getMaterial(corpus.MID);

        const color = 
                        "#" +
                        Math.floor(Math.random() * 16777215)
                            .toString(16)
                            .padStart(6, "0");

        return {

            PID: nextPID(),

            BPID: "",

            Objektname: corpus.name,

            Plattentyp: corpus.type,

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

            color: color,

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

                    ELID: getMaterial(child.ELID)?.materialNumber ?? "",

                    ERID: getMaterial(child.ERID)?.materialNumber ?? "",

                    ETID: getMaterial(child.ETID)?.materialNumber ?? "",

                    EBID: getMaterial(child.EBID)?.materialNumber ?? "",

                    Notiz: "",

                    color: color

                };

                return plate;

            })

        };

    });

    console.log("CADDaten", cadData);

    //Upload Project

    let projectId = id;
    if (mode != "edit") {
        const project = await axios.post("/api/projects/new", {
            customerId: selectedCustomer.id,
            title: projectName,
            description: projectDescription
        },
            {
                withCredentials: true
            });

        projectId = project.data.id

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

            // const response = await axios.post("/api/files/upload-url",
            //     {
            //         entityId: project.data.id,
            //         customerId: selectedCustomer.id,
            //         entity: "project",
            //         fileName: file.name,
            //         mimeType: mimeType,
            //         fileSize: file.size
            //     });

            // const s3response = await axios.put(
            //     response.data.uploadUrl,
            //     file,
            //     {
            //         headers: {
            //             "Content-Type": jsonContent.type
            //         }
            //     }
            // );

            const formData = new FormData();

            formData.append("file", file);
            formData.append("entityId", project.data.id);
            formData.append("customerId", selectedCustomer.id);
            formData.append("entity", "project");
            formData.append("fileName", file.name);
            formData.append("mimeType", mimeType);
            formData.append("fileSize", file.size);

            const response = await axios.post(
                "/api/files/upload",
                formData
            );

            console.log("response", response.data.fileEntry.id);

            // await axios.post(`/api/files/complete/`, {
            //     id: response.data.fileEntry.id
            // }
            // );
        }
    }
    const generatedData = cadData;

    if (!generatedData) return;

    // Datei beim Backend erstellen
        
    try {

        const response = await axios.post(
            `/api/projects/generated/${projectId}/list`,
            generatedData,
            {
                withCredentials: true,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        console.log("Upload response:", response.data);

    } catch (error) {

        console.error(
            "Error uploading list.json:",
            error
        );

        console.error(
            "Response:",
            error.response?.data
        );

    }

}