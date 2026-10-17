import { prepareProjectPartList } from "@Engine/cabinet/projectSave.js";
import { downloadFile, uploadJSONFile } from "../../../../shared/api/file-api.js";
import { getProjectFile, uploadProjectFile } from "../../../../shared/cache/project-cache.js";

export async function saveCabinetProject({
    cabinets,
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

    await Promise.all([
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
            data: cabinets,
            uploadFunction: {
                upload: uploadJSONFile,
                path: `/api/projects/generated/${projectId}/cabinet`
            }
        })
    ]);
}
