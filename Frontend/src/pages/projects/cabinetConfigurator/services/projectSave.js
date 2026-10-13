import { prepareProjectPartList } from "@Engine/cabinetConfigurator/projectSave.js";
import { downloadFile, uploadJSONFile } from "../../../../services/apiTemplates.js";
import { uploadProjectFile } from "../../../../services/projectMemoryCache.js";

export async function saveCabinetProject({
    cabinets,
    materials,
    projectId,
    defaultConfig,
    overwriteManual = false
}) {
    const existingData = overwriteManual
        ? []
        : await downloadFile(`/api/projects/generated/${projectId}/list`);

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
