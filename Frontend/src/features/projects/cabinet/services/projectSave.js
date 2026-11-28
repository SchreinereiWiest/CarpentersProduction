import { prepareProjectPartList } from "@Engine/cabinet/projectSave.js";
import { downloadFile, uploadJSONFile } from "../../../../shared/api/file-api.js";
import { getProjectFile, uploadProjectFile } from "../../../../shared/cache/project-cache.js";
import { compactCabinetVariantsForSave } from "../workspace/cabinetVariants.js";

export async function saveCabinetProject({
    cabinets,
    workspace,
    materials,
    projectId,
    defaultConfig,
    overwriteManual = false
}) {
    const existingData = overwriteManual
        ? []
        : await getProjectFile({
            projectId,
            file: "list.json",
            loadFromServer: {
                download: downloadFile,
                path: `/api/projects/generated/${projectId}/list`
            }
        });

    const listToSave = await prepareProjectPartList({
        cabinets,
        materials,
        defaultConfig,
        existingData,
        overwriteManual
    });

    if (!listToSave) {
        return;
    }

    const cabinetsToSave = compactCabinetVariantsForSave(cabinets);
    const uploads = [
        uploadProjectFile({
            projectId,
            file: "list.json",
            data: listToSave,
            uploadFunction: {
                upload: uploadJSONFile,
                path: `/api/projects/generated/${projectId}/list`
            }
        }),
        uploadProjectFile({
            projectId,
            file: "cabinet.json",
            data: cabinetsToSave,
            uploadFunction: {
                upload: uploadJSONFile,
                path: `/api/projects/generated/${projectId}/cabinet`
            }
        })
    ];

    if (workspace) {
        uploads.push(uploadProjectFile({
            projectId,
            file: "cabinetWorkspace.json",
            data: workspace,
            uploadFunction: {
                upload: uploadJSONFile,
                path: `/api/projects/generated/${projectId}/cabinetWorkspace`
            }
        }));
    }

    await Promise.all(uploads);
}
