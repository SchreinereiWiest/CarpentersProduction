import axios from 'axios';
import {uploadProjectFile} from "../../../services/projectMemoryCache.js";
import {uploadJSONFile} from "../../../services/apiTemplates.js";


export async function ProjectSave(corpuses, materials, selectedCustomer, files, projectDescription, projectName, mode, id, incomingCabinets) {

    if (selectedCustomer == null) {
        console.warn("No customer selected");
        selectedCustomer = {id: "1a87d110-bb96-4af3-9bc5-c0753e1fdadc"}
    }
    let cadData = null;
    console.log(corpuses);

    let pid = 0;

    const usedPIDs = new Set(
        corpuses.flatMap(corpus => [
            corpus._source?.PID,
            ...(corpus.Children ?? []).map(child => child._source?.PID)
        ]).filter(Boolean).map(String)
    );

    const nextPID = () => {
        let candidate;

        do {
            pid++;
            candidate = pid.toString().padStart(6, "0");
        } while (usedPIDs.has(candidate));

        usedPIDs.add(candidate);
        return candidate;
    };

    const getMaterial = (id) =>
        materials.find(m => m.id === id);

    const getMaterialNumber = (id, originalNumber = "") => {
        const material = getMaterial(id);
        if (material) return material.materialNumber;

        const originalMaterialExists = materials.some(
            item => item.materialNumber === originalNumber
        );

        if (id === "" && originalMaterialExists) return "";
        return originalNumber ?? "";
    };

    const getManualOrigin = (source) => source?._manualOrigin ?? {
        _generatedId: source?._generatedId,
        _cabinetId: source?._cabinetId,
        PID: source?.PID,
        Plattentyp: source?.Plattentyp,
        Objektname: source?.Objektname
    };

    console.log(corpuses);
    cadData = corpuses.map(corpus => {

        const corpusMaterial = getMaterial(corpus.MID);
        const source = corpus._source ?? {};

        const color = 
                        "#" +
                        Math.floor(Math.random() * 16777215)
                            .toString(16)
                            .padStart(6, "0");

        return {

            ...source,

            PID: source.PID ?? nextPID(),

            BPID: source.BPID ?? "",

            Objektname: corpus.name,

            Plattentyp: corpus.type,

            Anzahl: Number(corpus.quantity),

            L: Number(corpus.height),

            B: Number(corpus.width),

            T: Number(corpus.depth),

            MID: getMaterialNumber(corpus.MID, source.MID),

            Maserung: corpusMaterial?.maser ? "Ja" : source.Maserung ?? "",

            ELID: source.ELID ?? "",

            ERID: source.ERID ?? "",

            ETID: source.ETID ?? "",

            EBID: source.EBID ?? "",

            Kante: source.Kante ?? ":::",

            Notiz: source.Notiz ?? "",

            color: source.color ?? color,

            ...(corpus.manual || source.manual ? {
                manual: true,
                _manualOrigin: getManualOrigin(source)
            } : {}),

            Children: (corpus.Children ?? []).map(child => {

                const material = getMaterial(child.MID);
                const childSource = child._source ?? {};

                const plate = {

                    ...childSource,

                    PID: childSource.PID ?? nextPID(),

                    BPID: childSource.BPID ?? "Nein",

                    Objektname: child.name,

                    Plattentyp: child.type,

                    Anzahl: Number(child.quantity),

                    L: Number(child.height),

                    B: Number(child.width),

                    T: Number(child.depth),

                    MID: getMaterialNumber(child.MID, childSource.MID),

                    Maserung: material?.maser ? "Ja" : childSource.Maserung ?? "",

                    ELID: getMaterialNumber(child.ELID, childSource.ELID),

                    ERID: getMaterialNumber(child.ERID, childSource.ERID),

                    ETID: getMaterialNumber(child.ETID, childSource.ETID),

                    EBID: getMaterialNumber(child.EBID, childSource.EBID),

                    Notiz: childSource.Notiz ?? "",

                    color: childSource.color ?? color,

                    ...(child.manual || childSource.manual ? {
                        manual: true,
                        _manualOrigin: getManualOrigin(childSource)
                    } : {})

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

        const response = await uploadProjectFile({

            projectId,

            file: "list.json",

            data: generatedData,
            
            uploadFunction: {upload: uploadJSONFile, path:`/api/projects/generated/${projectId}/list`}
        });

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

    if(incomingCabinets) {
        try {

        const response = await uploadProjectFile({
        
            projectId,

            file: "cabinet.json",

            data: incomingCabinets,
            
            uploadFunction: {upload: uploadJSONFile, path:`/api/projects/generated/${projectId}/cabinet`}
        });

    } catch (error) {

        console.error(
            "Error uploading cabinet.json:",
            error
        );

        console.error(
            "Response:",
            error.response?.data
        );
    }
    }
    

}
