import { buildPartList } from "./partList/buildPartList";
import {uploadProjectFile} from "../../../../services/projectMemoryCache.js";
import {downloadFile, uploadJSONFile} from "../../../../services/apiTemplates.js";
import axios from "axios";

const isManualPart = part => part?.manual === true;

const getOriginalPart = part => part?._manualOrigin ?? part;

const samePartIdentity = (generated, existing) => {
    const original = getOriginalPart(existing);
    const generatedId = original?._generatedId ?? existing?._generatedId;
    const cabinetId = original?._cabinetId ?? existing?._cabinetId;
    const partType = original?.Plattentyp ?? existing?.Plattentyp;
    const partName = original?.Objektname ?? existing?.Objektname;

    if (generated?._generatedId && generatedId) {
        return generated._generatedId === generatedId;
    }

    if (generated?._cabinetId && cabinetId) {
        return String(generated._cabinetId) === String(cabinetId);
    }

    return Boolean(
        generated?.Plattentyp === partType &&
        generated?.Objektname === partName
    );
};

const ensureUniquePartIds = partList => {
    const usedIds = new Set();
    let manualId = 0;

    const normalizePart = part => {
        const normalized = { ...part };
        let id = normalized.PID;

        if (id !== null && id !== undefined && usedIds.has(String(id))) {
            do {
                manualId += 1;
                id = `M${String(manualId).padStart(6, "0")}`;
            } while (usedIds.has(id));

            normalized.PID = id;
        }

        if (id !== null && id !== undefined) {
            usedIds.add(String(id));
        }

        if (Array.isArray(normalized.Children)) {
            normalized.Children = normalized.Children.map(normalizePart);
        }

        return normalized;
    };

    return partList.map(normalizePart);
};

export function mergeManualPartList(generatedData = [], existingData = []) {
    const existingRoots = Array.isArray(existingData) ? existingData : [];
    const usedRoots = new Set();

    const mergedData = generatedData.map(generatedRoot => {
        const existingIndex = existingRoots.findIndex((root, index) =>
            !usedRoots.has(index) && samePartIdentity(generatedRoot, root)
        );

        if (existingIndex === -1) {
            return generatedRoot;
        }

        usedRoots.add(existingIndex);
        const existingRoot = existingRoots[existingIndex];
        const existingChildren = Array.isArray(existingRoot?.Children)
            ? existingRoot.Children
            : [];
        const generatedChildren = Array.isArray(generatedRoot?.Children)
            ? generatedRoot.Children
            : [];
        const usedChildren = new Set();

        const mergedChildren = generatedChildren.map(generatedChild => {
            const existingIndex = existingChildren.findIndex((child, index) =>
                !usedChildren.has(index) &&
                isManualPart(child) &&
                samePartIdentity(generatedChild, child)
            );

            if (existingIndex === -1) {
                return generatedChild;
            }

            usedChildren.add(existingIndex);
            const existingChild = existingChildren[existingIndex];
            return {
                ...generatedChild,
                ...existingChild,
                PID: generatedChild.PID,
                _generatedId: generatedChild._generatedId ?? existingChild._generatedId,
                manual: true
            };
        });

        existingChildren.forEach((child, index) => {
            if (isManualPart(child) && !usedChildren.has(index)) {
                mergedChildren.push(child);
            }
        });

        const { Children: _oldChildren, ...existingRootFields } = existingRoot;
        const rootFields = isManualPart(existingRoot)
            ? existingRootFields
            : {};

        return {
            ...generatedRoot,
            ...rootFields,
            PID: generatedRoot.PID,
            _generatedId: generatedRoot._generatedId ?? existingRoot._generatedId,
            _cabinetId: generatedRoot._cabinetId ?? existingRoot._cabinetId,
            Children: mergedChildren
        };
    });

    existingRoots.forEach((root, index) => {
        if (usedRoots.has(index)) return;

        const children = Array.isArray(root?.Children) ? root.Children : [];
        const manualChildren = children.filter(isManualPart);

        if (isManualPart(root)) {
            mergedData.push(root);
        } else if (manualChildren.length > 0) {
            mergedData.push({
                ...root,
                Children: manualChildren
            });
        }
    });

    return ensureUniquePartIds(mergedData);
}

export async function ProjectSave(
    cabinets,
    materials,
    selectedCustomer,
    files,
    projectDescription,
    projectName,
    mode,
    id,
    defaultConfig,
    overwriteManual = false
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

    let listToSave = generatedData;

    if (!overwriteManual) {
        const existingData = await downloadFile(
            `/api/projects/generated/${projectId}/list`
        );

        listToSave = mergeManualPartList(generatedData, existingData);
    }


    try {

        const response = await uploadProjectFile({

            projectId,

            file: "list.json",

            data: listToSave,

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
