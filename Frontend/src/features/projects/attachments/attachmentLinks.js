import { downloadFile, uploadJSONFile } from "../../../shared/api/file-api.js";
import { getProjectFile, uploadProjectFile } from "../../../shared/cache/project-cache.js";

export const ATTACHMENT_LINKS_FILE = "attachmentLinks.json";

export const isProjectAttachmentFile = (file) => {
  const mimeType = String(file?.mimeType || "").toLowerCase();
  const fileName = String(file?.fileName || "").toLowerCase();
  return mimeType === "application/pdf"
    || mimeType === "image/jpeg"
    || mimeType === "image/jpg"
    || fileName.endsWith(".pdf")
    || fileName.endsWith(".jpg")
    || fileName.endsWith(".jpeg");
};

export const normalizeAttachmentLinks = (value) => ({
  version: 1,
  links: Object.fromEntries(Object.entries(value?.links ?? {}).map(([fileId, cabinetIds]) => [
    String(fileId),
    [...new Set((Array.isArray(cabinetIds) ? cabinetIds : []).map(String).filter(Boolean))]
  ]).filter(([, cabinetIds]) => cabinetIds.length > 0)),
  updatedAt: value?.updatedAt ?? null
});

export const loadAttachmentLinks = async (projectId) => {
  try {
    const data = await getProjectFile({
      projectId,
      file: ATTACHMENT_LINKS_FILE,
      loadFromServer: {
        download: downloadFile,
        path: `/api/projects/generated/${projectId}/attachmentLinks`
      }
    });
    return normalizeAttachmentLinks(data);
  } catch (error) {
    if (error.response?.status !== 404 && error.code !== "OFFLINE_RESOURCE_UNAVAILABLE") throw error;
    return normalizeAttachmentLinks(null);
  }
};

export const saveAttachmentLinks = async (projectId, value) => {
  const normalized = normalizeAttachmentLinks({
    ...value,
    updatedAt: new Date().toISOString()
  });
  await uploadProjectFile({
    projectId,
    file: ATTACHMENT_LINKS_FILE,
    data: normalized,
    uploadFunction: {
      upload: uploadJSONFile,
      path: `/api/projects/generated/${projectId}/attachmentLinks`
    }
  });
  return normalized;
};

export const cabinetIdsForAttachment = (links, attachmentId) => (
  normalizeAttachmentLinks(links).links[String(attachmentId)] ?? []
);

export const attachmentsForCabinet = (attachments, links, cabinetId) => {
  const normalizedCabinetId = String(cabinetId || "");
  return (attachments ?? []).filter((attachment) => (
    cabinetIdsForAttachment(links, attachment.id).includes(normalizedCabinetId)
  ));
};
