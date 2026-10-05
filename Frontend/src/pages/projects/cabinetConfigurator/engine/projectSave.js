import { buildPartList } from "./partList/buildPartList";
import {uploadProjectFile} from "../../../../services/projectMemoryCache.js";
import {uploadJSONFile} from "../../../../services/apiTemplates.js";
import axios from "axios";

export async function ProjectSave(
    cabinets,
    materials,
    selectedCustomer,
    files,
    projectDescription,
    projectName,
    mode,
    id,
    defaultConfig
) {

    if (
        selectedCustomer == null
    ) {

        console.warn(
            "No customer selected"
        );

        selectedCustomer = {
            id:
                "1a87d110-bb96-4af3-9bc5-c0753e1fdadc"
        };
    }

    console.log("ca", cabinets);


    // =========================================================
    // Part List + CNC erzeugen
    // =========================================================
    const generatedData =
        await buildPartList(
            cabinets,
            materials,
            defaultConfig
        );


    console.log(
        "Generierte Part List:",
        generatedData
    );


    let projectId = id;


    // =========================================================
    // list.json inklusive CNC
    // =========================================================

    if (
        !generatedData
    ) {
        return;
    }


    try {

        const response = await uploadProjectFile({

            projectId,

            file: "list.json",

            data: generatedData,

            uploadFunction: {upload: uploadJSONFile, path:`/api/projects/generated/${projectId}/list`}
        });
            

        console.log(
            "Upload response:",
            response.data
        );

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

    try {

        const response = await uploadProjectFile({

            projectId,

            file: "cabinet.json",

            data: cabinets,
            
            uploadFunction: {upload: uploadJSONFile, path:`/api/projects/generated/${projectId}/cabinet`}
        });

        console.log(
            "Upload response:",
            response.data
        );

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