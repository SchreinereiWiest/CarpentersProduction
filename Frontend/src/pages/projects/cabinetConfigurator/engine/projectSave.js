import { buildPartList } from "./partList/buildPartList";
import axios from "axios";

export async function ProjectSave(
    cabinets,
    materials,
    selectedCustomer,
    files,
    projectDescription,
    projectName,
    mode,
    id
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

    console.log(cabinets);


    // =========================================================
    // Part List + CNC erzeugen
    // =========================================================

    const generatedData =
        buildPartList(
            cabinets,
            materials
        );


    console.log(
        "Generierte Part List:",
        generatedData
    );


    let projectId = id;


    // =========================================================
    // Neues Projekt
    // =========================================================

    if (
        mode !== "edit"
    ) {

        // const project =
        //     await axios.post(
        //         "/api/projects/new",
        //         {
        //             customerId:
        //                 selectedCustomer.id,

        //             title:
        //                 projectName,

        //             description:
        //                 projectDescription
        //         },
        //         {
        //             withCredentials:
        //                 true
        //         }
        //     );


        // projectId = project.data.id;


        // Dateien
        for (
            const file of files
        ) {

            let mimeType =
                file.type;


            if (
                !mimeType
            ) {

                const extension =
                    file.name
                        .split(".")
                        .pop()
                        .toLowerCase();


                switch (
                    extension
                ) {

                    case "glb":
                        mimeType =
                            "model/gltf-binary";
                        break;

                    case "gltf":
                        mimeType =
                            "model/gltf+json";
                        break;
                }
            }


            const formData =
                new FormData();


            formData.append(
                "file",
                file
            );

            formData.append(
                "entityId",
                projectId
            );

            formData.append(
                "customerId",
                selectedCustomer.id
            );

            formData.append(
                "entity",
                "project"
            );

            formData.append(
                "fileName",
                file.name
            );

            formData.append(
                "mimeType",
                mimeType
            );

            formData.append(
                "fileSize",
                file.size
            );


            await axios.post(
                "/api/files/upload",
                formData
            );
        }
    }


    // =========================================================
    // list.json inklusive CNC
    // =========================================================

    if (
        !generatedData
    ) {
        return;
    }


    try {

        const response =
            await axios.post(

                `/api/projects/generated/${projectId}/list`,

                generatedData,

                {
                    withCredentials:
                        true,

                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );


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

        const response =
            await axios.post(

                `/api/projects/generated/${projectId}/cabinet`,

                cabinets,

                {
                    withCredentials:
                        true,

                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );


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