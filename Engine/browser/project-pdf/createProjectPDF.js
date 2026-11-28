import {
    createCabinetSvg,
    getCabinetFunctionLines,
    getCabinetInformation
} from "./cabinetSvgRenderer.js";
import {
    createNestingPlateSvg,
    getNestingPlateEntries
} from "./nestingSvgRenderer.js";
import { paginateNestingCuts } from "../../src/nesting/cutPlan.js";
import { createCncProgramSvg, getCncPrograms } from "./cncProgramSvgRenderer.js";
import {
    COVER_BLOCK_LAYOUTS,
    getCabinetImageLayouts,
    getExposeCoverText,
    getExposeBlockLayout,
    getVisualTemplateLayouts,
    isExposePageEnabled,
    normalizeExposeTemplateId
} from "./exposeLayout.js";
import { fitWithin, rasterizeImageBlob, rasterizeSvg } from "./svgUtils.js";

const PORTRAIT_WIDTH = 210;
const PORTRAIT_HEIGHT = 297;
const LANDSCAPE_WIDTH = 297;
const LANDSCAPE_HEIGHT = 210;
const PAGE_MARGIN = 12;
const NESTING_RASTER_SCALE = 2.2;

const DEFAULT_EXPOSE = {
    version: 2,
    cover: {
        eyebrow: "PROJEKTMAPPE",
        title: "",
        subtitle: "Entwurf, Aufmaß und Fertigungsunterlagen",
        description: "",
        status: "ENTWURF",
        dataDate: "",
        projectNumber: ""
    },
    text: {
        perspectivesHeading: "Perspektiven & Gestaltung",
        perspectivesBody: "Visualisierungen und Projektbilder geben einen Überblick über Gestaltung, Proportionen und Materialwirkung.",
        measurementHeading: "Aufmaß & Planung",
        measurementBody: "Technische Ansichten aus dem Aufmaß. Verbindlich sind die eingetragenen Maße und die freigegebenen Fertigungsunterlagen.",
        cabinetIntro: "Korpusblätter mit Außenmaßen, Material, Konstruktion und Funktionen.",
        nestingIntro: "Nesting / Verschnittoptimierung",
        footerNote: "Projektunterlagen · nur gültig mit aktuellem Datenstand"
    },
    sections: {
        perspectives: true,
        measurement: true,
        cabinets: true,
        partsList: true,
        cnc: true,
        nesting: true
    },
    selectedImageIds: [],
    selectedViewIds: [],
    assetText: {},
    coverTextOverrides: {},
    customBlocks: {},
    imageOverrides: {},
    pageTemplates: {},
    manualPages: [],
    pageOrder: [],
    cncProgramsPerPage: 4,
    disabledPageIds: [],
    pageLayouts: {}
};

const normalizeExpose = value => ({
    ...DEFAULT_EXPOSE,
    ...(value ?? {}),
    version: 2,
    cover: { ...DEFAULT_EXPOSE.cover, ...(value?.cover ?? {}) },
    text: { ...DEFAULT_EXPOSE.text, ...(value?.text ?? {}) },
    sections: { ...DEFAULT_EXPOSE.sections, ...(value?.sections ?? {}) },
    selectedImageIds: Array.isArray(value?.selectedImageIds) ? value.selectedImageIds.map(String) : [],
    selectedViewIds: Array.isArray(value?.selectedViewIds) ? value.selectedViewIds.map(String) : [],
    assetText: value?.assetText && typeof value.assetText === "object" ? value.assetText : {},
    coverTextOverrides: value?.coverTextOverrides && typeof value.coverTextOverrides === "object" ? value.coverTextOverrides : {},
    customBlocks: value?.customBlocks && typeof value.customBlocks === "object" ? value.customBlocks : {},
    imageOverrides: value?.imageOverrides && typeof value.imageOverrides === "object" ? value.imageOverrides : {},
    pageTemplates: Object.fromEntries(Object.entries(value?.pageTemplates && typeof value.pageTemplates === "object" ? value.pageTemplates : {}).map(([pageId, templateId]) => [pageId, templateId === "standard" ? "info" : templateId === "subtitle" ? "title" : templateId])),
    manualPages: Array.isArray(value?.manualPages)
        ? value.manualPages.map(page => ({
            ...page,
            orientation: page?.orientation === "portrait" ? "portrait" : "landscape"
        }))
        : [],
    pageOrder: Array.isArray(value?.pageOrder) ? value.pageOrder.map(String) : [],
    cncProgramsPerPage: Math.max(1, Math.min(8, Number(value?.cncProgramsPerPage) || 4)),
    disabledPageIds: Array.isArray(value?.disabledPageIds) ? value.disabledPageIds.map(String) : [],
    pageLayouts: value?.pageLayouts && typeof value.pageLayouts === "object" ? value.pageLayouts : {}
});

const cleanFileName = value => String(value || "Projekt")
    .split("")
    .map(character => character.charCodeAt(0) < 32 ? "-" : character)
    .join("")
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

const formatDate = value => {
    if (!value) return new Date().toLocaleDateString("de-DE");
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("de-DE");
};

const formatNumber = value => new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 1
}).format(Number(value) || 0);

export const getImagePageLayout = (width, height) => {
    const landscape = Number(width) > Number(height);
    if (landscape) {
        return {
            orientation: "landscape",
            pageWidth: PORTRAIT_HEIGHT,
            pageHeight: PORTRAIT_WIDTH,
            x: 0,
            y: 0,
            width: PORTRAIT_HEIGHT,
            height: PORTRAIT_WIDTH
        };
    }
    const fitted = fitWithin(
        width,
        height,
        PORTRAIT_WIDTH - PAGE_MARGIN * 2,
        PORTRAIT_HEIGHT - PAGE_MARGIN * 2
    );
    return {
        orientation: "portrait",
        pageWidth: PORTRAIT_WIDTH,
        pageHeight: PORTRAIT_HEIGHT,
        x: (PORTRAIT_WIDTH - fitted.width) / 2,
        y: (PORTRAIT_HEIGHT - fitted.height) / 2,
        width: fitted.width,
        height: fitted.height
    };
};

const drawFooter = (doc, expose, projectTitle, pageNumber = null) => {
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    doc.setDrawColor(199, 196, 188);
    doc.setLineWidth(0.2);
    doc.line(PAGE_MARGIN, height - 9, width - PAGE_MARGIN, height - 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.8);
    doc.setTextColor(105, 111, 114);
    doc.text(expose.text.footerNote || "Projektunterlagen", PAGE_MARGIN, height - 5.4);
    doc.text(projectTitle, width / 2, height - 5.4, { align: "center" });
    if (pageNumber != null) doc.text(String(pageNumber).padStart(2, "0"), width - PAGE_MARGIN, height - 5.4, { align: "right" });
};

const drawSectionHeader = (doc, section, title, subtitle, expose, projectTitle, { minimal = false } = {}) => {
    const pageNumber = doc.getNumberOfPages() - 1;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...(minimal ? [88, 99, 104] : [174, 96, 51]));
    doc.text(section, PAGE_MARGIN, 12);
    if (title) {
        doc.setFontSize(16);
        doc.setTextColor(27, 38, 45);
        doc.text(title, PAGE_MARGIN, 23);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(105, 114, 119);
    doc.text(doc.splitTextToSize(subtitle, 260).slice(0, 1), PAGE_MARGIN, title ? 29 : 23);
    drawFooter(doc, expose, projectTitle, pageNumber);
};

const drawLogo = (doc, branding, x, y, maxWidth, maxHeight, warnings) => {
    if (!branding?.logoDataUrl) return false;
    try {
        const fitted = fitWithin(
            branding.logoWidth || maxWidth,
            branding.logoHeight || maxHeight,
            maxWidth,
            maxHeight
        );
        const format = String(branding.logoMimeType).includes("png") ? "PNG" : "JPEG";
        doc.addImage(
            branding.logoDataUrl,
            format,
            x,
            y + (maxHeight - fitted.height) / 2,
            fitted.width,
            fitted.height,
            undefined,
            "FAST"
        );
        return true;
    } catch (error) {
        warnings.push(`Unternehmenslogo: ${error.message}`);
        return false;
    }
};

const textLineLimit = (layout, fontSize, lineHeightFactor = 1.15) =>
    Math.max(1, Math.floor(layout.height / (fontSize * 0.3528 * lineHeightFactor)));

const drawLayoutText = (doc, text, layout, {
    font = "helvetica",
    style = "normal",
    fontSize = 9,
    color = [25, 36, 44],
    lineHeightFactor = 1.15,
    transform = value => value
} = {}) => {
    doc.setFont(font, style);
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const lines = doc
        .splitTextToSize(transform(String(text ?? "")), layout.width)
        .slice(0, textLineLimit(layout, fontSize, lineHeightFactor));
    doc.text(lines, layout.x, layout.y + fontSize * 0.3528, { lineHeightFactor });
};

const drawCover = async (doc, { expose, project, customer, branding, warnings, imageAssets }) => {
    const projectTitle = project?.title || project?.name || "Projekt";
    const coverTitle = getExposeCoverText(expose, "title", projectTitle);
    const customerName = [customer?.firstName, customer?.lastName].filter(Boolean).join(" ");
    const description = getExposeCoverText(
        expose,
        "description",
        project?.description || "Projektunterlagen und Planungsstand in einer klaren Dokumentation."
    );

    doc.addPage("a4", "landscape");
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, LANDSCAPE_WIDTH, LANDSCAPE_HEIGHT, "F");
    const coverTemplate = normalizeExposeTemplateId(expose.pageTemplates?.cover, "title");
    const minimalTemplate = coverTemplate === "minimal";
    if (!minimalTemplate) {
        doc.setFillColor(23, 42, 54);
        doc.rect(0, 0, 112, LANDSCAPE_HEIGHT, "F");
        doc.setFillColor(181, 100, 55);
        doc.rect(112, 0, 2.2, LANDSCAPE_HEIGHT, "F");
    }

    const layout = blockId => getExposeBlockLayout(
        expose,
        "cover",
        blockId,
        COVER_BLOCK_LAYOUTS[blockId]
    );
    const logo = layout("logo");

    if (!drawLogo(doc, branding, logo.x, logo.y, logo.width, logo.height, warnings)) {
        doc.setDrawColor(110, 131, 143);
        doc.setLineWidth(0.35);
        doc.roundedRect(logo.x, logo.y, logo.width, logo.height, 1.5, 1.5, "S");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.2);
        doc.setTextColor(...(minimalTemplate ? [99, 112, 119] : [190, 202, 208]));
        doc.text("UNTERNEHMENSLOGO", logo.x + logo.width / 2, logo.y + logo.height / 2 + 2, { align: "center" });
    }

    drawLayoutText(doc, getExposeCoverText(expose, "eyebrow", "PROJEKTMAPPE"), layout("eyebrow"), {
        style: "bold", fontSize: layout("eyebrow").fontSize ?? 7, color: [213, 158, 119], transform: value => value.toUpperCase()
    });
    drawLayoutText(doc, coverTitle, layout("leftTitle"), {
        style: "bold", fontSize: layout("leftTitle").fontSize ?? 23, color: minimalTemplate ? [25, 36, 44] : [255, 255, 255], lineHeightFactor: 1.05
    });
    drawLayoutText(doc, getExposeCoverText(expose, "subtitle", DEFAULT_EXPOSE.cover.subtitle), layout("subtitle"), {
        fontSize: layout("subtitle").fontSize ?? 8.5, color: minimalTemplate ? [93, 105, 111] : [190, 202, 208], lineHeightFactor: 1.35
    });
    drawLayoutText(doc, getExposeCoverText(expose, "status", "ENTWURF"), layout("status"), {
        style: "bold", fontSize: layout("status").fontSize ?? 6.5, color: [174, 96, 51], transform: value => value.toUpperCase()
    });
    drawLayoutText(doc, coverTitle, layout("rightTitle"), {
        style: "bold", fontSize: layout("rightTitle").fontSize ?? 26, color: [25, 36, 44], lineHeightFactor: 1.02
    });
    if (customerName) {
        drawLayoutText(doc, customerName, layout("customer"), {
            fontSize: 10, color: [93, 105, 111]
        });
    }

    drawLayoutText(doc, description, layout("description"), {
        fontSize: layout("description").fontSize ?? 9.2, color: [78, 93, 101], lineHeightFactor: 1.45
    });
    const meta = layout("meta");
    doc.setDrawColor(199, 193, 183);
    doc.setLineWidth(0.25);
    doc.line(meta.x, meta.y, meta.x + meta.width, meta.y);
    doc.setFontSize(6.2);
    doc.setTextColor(104, 111, 114);
    doc.text(`DATENSTAND ${formatDate(expose.cover.dataDate)}`, meta.x, meta.y + Math.min(8, meta.height));
    doc.text(expose.cover.projectNumber || "PROJEKTMAPPE", meta.x + meta.width, meta.y + Math.min(8, meta.height), { align: "right" });
    await drawCustomBlocks(doc, expose, "cover", { imageAssets, branding, warnings });
    drawFooter(doc, expose, projectTitle, 1);
};

const prepareRaster = async asset => {
    if (asset?.dataUrl) {
        return {
            dataUrl: asset.dataUrl,
            format: asset.format || "PNG",
            width: asset.width || 1,
            height: asset.height || 1
        };
    }
    return rasterizeImageBlob(asset.blob);
};

export const getContainedImagePlacement = ({
    sourceWidth,
    sourceHeight,
    targetWidth,
    targetHeight,
    zoom = 1,
    cropX = 50,
    cropY = 50
}) => {
    const safeSourceWidth = Math.max(1, Number(sourceWidth) || 1);
    const safeSourceHeight = Math.max(1, Number(sourceHeight) || 1);
    const safeTargetWidth = Math.max(1, Number(targetWidth) || 1);
    const safeTargetHeight = Math.max(1, Number(targetHeight) || 1);
    const containScale = Math.min(
        safeTargetWidth / safeSourceWidth,
        safeTargetHeight / safeSourceHeight
    );
    const drawWidth = safeSourceWidth * containScale * Math.max(1, Number(zoom) || 1);
    const drawHeight = safeSourceHeight * containScale * Math.max(1, Number(zoom) || 1);
    const positionX = Math.max(0, Math.min(100, Number(cropX) || 0)) / 100;
    const positionY = Math.max(0, Math.min(100, Number(cropY) || 0)) / 100;
    return {
        x: drawWidth <= safeTargetWidth
            ? (safeTargetWidth - drawWidth) / 2
            : -(drawWidth - safeTargetWidth) * positionX,
        y: drawHeight <= safeTargetHeight
            ? (safeTargetHeight - drawHeight) / 2
            : -(drawHeight - safeTargetHeight) * positionY,
        width: drawWidth,
        height: drawHeight
    };
};

const cropRasterToLayout = (raster, layout) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
        const sourceWidth = image.naturalWidth || raster.width || 1;
        const sourceHeight = image.naturalHeight || raster.height || 1;
        const canvas = document.createElement("canvas");
        const rasterScale = Math.min(6, 1800 / layout.width, 1800 / layout.height);
        canvas.width = Math.max(1, Math.round(layout.width * rasterScale));
        canvas.height = Math.max(1, Math.round(layout.height * rasterScale));
        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        const placement = getContainedImagePlacement({
            sourceWidth,
            sourceHeight,
            targetWidth: canvas.width,
            targetHeight: canvas.height,
            zoom: layout.zoom,
            cropX: layout.cropX,
            cropY: layout.cropY
        });
        context.drawImage(
            image,
            placement.x,
            placement.y,
            placement.width,
            placement.height
        );
        resolve({ dataUrl: canvas.toDataURL("image/png"), format: "PNG" });
    };
    image.onerror = () => reject(new Error("Der gewählte Bildausschnitt konnte nicht gerendert werden."));
    image.src = raster.dataUrl;
});

const drawCustomBlocks = async (doc, expose, pageId, { imageAssets = [], branding, warnings }) => {
    const blocks = Array.isArray(expose.customBlocks?.[pageId])
        ? expose.customBlocks[pageId]
        : [];
    for (const block of blocks) {
        const layout = block?.layout;
        if (!layout || !(layout.width > 0) || !(layout.height > 0)) continue;
        try {
            if (block.type === "text") {
                drawLayoutText(doc, block.text ?? "", layout, {
                    fontSize: Math.max(5, Math.min(36, Number(layout.fontSize) || 9)),
                    color: [36, 51, 59],
                    lineHeightFactor: 1.35
                });
            } else if (block.type === "qr") {
                if (!block.qrDataUrl) continue;
                const size = Math.min(layout.width, layout.height);
                doc.addImage(
                    block.qrDataUrl,
                    "PNG",
                    layout.x + (layout.width - size) / 2,
                    layout.y + (layout.height - size) / 2,
                    size,
                    size,
                    undefined,
                    "FAST"
                );
            } else if (block.type === "logo") {
                drawLogo(doc, branding, layout.x, layout.y, layout.width, layout.height, warnings);
            } else if (block.type === "image") {
                const asset = imageAssets.find(candidate => String(candidate.id) === String(block.imageId));
                if (!asset) continue;
                const cropped = await cropRasterToLayout(await prepareRaster(asset), layout);
                doc.addImage(cropped.dataUrl, cropped.format, layout.x, layout.y, layout.width, layout.height, undefined, "FAST");
            }
        } catch (error) {
            warnings.push(`${block.type === "image" ? "Projektbild" : "Exposé-Objekt"}: ${error.message}`);
        }
    }
};

const addVisualPages = async (doc, assets, options) => {
    const { section, heading, body, expose, projectTitle, warnings, pagePrefix, imageAssets, branding } = options;
    for (const [index, asset] of (assets ?? []).entries()) {
        try {
            const assetCopy = expose.assetText?.[asset.id] ?? {};
            const pageTitle = Object.prototype.hasOwnProperty.call(assetCopy, "title")
                ? String(assetCopy.title ?? "")
                : asset.label || asset.name || `${heading} ${index + 1}`;
            const pageId = `${pagePrefix}:${asset.id}`;
            const templateId = normalizeExposeTemplateId(expose.pageTemplates?.[pageId]);
            const templateLayouts = getVisualTemplateLayouts(templateId);
            const overrideAsset = imageAssets.find(candidate =>
                String(candidate.id) === String(expose.imageOverrides?.[pageId])
            );
            const raster = await prepareRaster(overrideAsset ?? asset);
            const imageBox = getExposeBlockLayout(expose, pageId, "image", templateLayouts.image);
            const titleBox = getExposeBlockLayout(expose, pageId, "title", templateLayouts.title);
            const bodyBox = getExposeBlockLayout(expose, pageId, "body", templateLayouts.body);
            const cropped = await cropRasterToLayout(raster, imageBox);
            doc.addPage("a4", "landscape");
            options.renderedPageIds?.push(pageId);
            drawSectionHeader(doc, section, "", heading, expose, projectTitle, { minimal: templateId === "minimal" });

            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(197, 201, 201);
            doc.roundedRect(imageBox.x, imageBox.y, imageBox.width, imageBox.height, 1.5, 1.5, "FD");
            doc.addImage(
                cropped.dataUrl,
                cropped.format,
                imageBox.x,
                imageBox.y,
                imageBox.width,
                imageBox.height,
                undefined,
                "FAST"
            );

            doc.setFillColor(228, 221, 209);
            if (templateId === "info") doc.roundedRect(224, 37, 2.2, 158, 1, 1, "F");
            if (templateId === "info-horizontal") doc.roundedRect(12, 143, 273, 2.2, 1, 1, "F");
            drawLayoutText(doc, pageTitle, titleBox, {
                style: "bold", fontSize: titleBox.fontSize ?? 12.5, color: [28, 40, 47], lineHeightFactor: 1.12
            });
            drawLayoutText(
                doc,
                Object.prototype.hasOwnProperty.call(assetCopy, "text") ? assetCopy.text : body,
                bodyBox,
                {
                fontSize: bodyBox.fontSize ?? 7.4, color: [83, 98, 105], lineHeightFactor: 1.38
                }
            );
            doc.setFontSize(5.7);
            doc.setTextColor(116, 123, 126);
            doc.text(`Ansicht ${index + 1} von ${assets.length}`, 231, 184);
            await drawCustomBlocks(doc, expose, pageId, { imageAssets, branding, warnings });
            await options.afterPage?.(pageId);
        } catch (error) {
            warnings.push(`${asset.name || asset.label || "Projektansicht"}: ${error.message}`);
        }
    }
};

const drawWrappedLines = (doc, lines, x, startY, width, maxY) => {
    const availableHeight = Math.max(1, maxY - startY);
    let fontSize = 6.2;
    let wrappedLines = [];
    let heightUnits = 1;
    const createLayout = size => {
        doc.setFontSize(size);
        wrappedLines = lines.map(line => doc.splitTextToSize(line, width));
        heightUnits = wrappedLines.reduce((total, wrapped) => total + wrapped.length + 0.3, 0);
    };
    createLayout(fontSize);
    while (fontSize > 3.5 && heightUnits * fontSize * 0.46 > availableHeight) {
        fontSize -= 0.2;
        createLayout(fontSize);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(54, 65, 72);
    const lineHeight = fontSize * 0.46;
    let y = startY;
    wrappedLines.forEach(wrapped => {
        wrapped.forEach(part => {
            if (y <= maxY) doc.text(part, x, y);
            y += lineHeight;
        });
        y += lineHeight * 0.3;
    });
};

const drawCabinetCard = async (doc, cabinet, index, x, y, width, height, context, drawingBox) => {
    doc.setFillColor(250, 249, 246);
    doc.setDrawColor(202, 202, 197);
    doc.roundedRect(x, y, width, height, 1.5, 1.5, "FD");
    doc.setFillColor(32, 47, 57);
    doc.roundedRect(x, y, width, 15, 1.5, 1.5, "F");
    doc.rect(x, y + 10, width, 5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(218, 167, 126);
    doc.text(`B${String(index + 1).padStart(2, "0")}`, x + 5, y + 9.5);
    doc.setFontSize(11.5);
    doc.setTextColor(255, 255, 255);
    doc.text(String(cabinet.name || `Korpus ${index + 1}`).slice(0, 35), x + 21, y + 9.5);

    const svg = createCabinetSvg(cabinet, { cncConfig: context.cncConfig });
    const targetPixels = fitWithin(svg.width, svg.height, 800, 1050);
    const raster = await rasterizeSvg(svg.svg, { width: targetPixels.width, height: targetPixels.height });
    const fitted = fitWithin(svg.width, svg.height, drawingBox.width, drawingBox.height);

    const information = getCabinetInformation(cabinet, context.materials)
        .map(([label, value]) => `${label.toUpperCase()}\n${value}`);
    const functions = getCabinetFunctionLines(cabinet);
    const informationBottom = y + height - 52;
    drawWrappedLines(doc, information, x + 67, y + 23, width - 72, informationBottom);
    doc.setFillColor(241, 237, 230);
    doc.setDrawColor(221, 214, 203);
    doc.roundedRect(x + 65, informationBottom + 3, width - 69, 43, 1.2, 1.2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(143, 91, 58);
    doc.text("FUNKTIONEN / INNENAUSBAU", x + 69, informationBottom + 10);
    drawWrappedLines(
        doc,
        functions.length ? functions.map(line => `• ${line}`) : ["• Keine Funktionen hinterlegt"],
        x + 69,
        informationBottom + 17,
        width - 77,
        y + height - 8
    );
    doc.addImage(
        raster.dataUrl,
        "PNG",
        drawingBox.x + (drawingBox.width - fitted.width) / 2,
        drawingBox.y + (drawingBox.height - fitted.height) / 2,
        fitted.width,
        fitted.height,
        undefined,
        "FAST"
    );
};

const addCabinetPages = async (doc, cabinets, context) => {
    for (let index = 0; index < cabinets.length; index += 2) {
        const pageId = `cabinet:${index / 2}`;
        const templateId = normalizeExposeTemplateId(context.expose.pageTemplates?.[pageId], "cabinet-standard");
        const area = templateId === "info"
            ? { x: 12, y: 36, width: 205, height: 159 }
            : templateId === "info-horizontal"
                ? { x: 12, y: 36, width: 273, height: 103 }
                : { x: 12, y: 36, width: 273, height: 159 };
        const cardGap = 3;
        const cardWidth = (area.width - cardGap) / 2;
        const cardHeight = area.height;
        const cabinetImageFallbacks = getCabinetImageLayouts(templateId, Math.min(2, cabinets.length - index));
        doc.addPage("a4", "landscape");
        context.renderedPageIds?.push(pageId);
        drawSectionHeader(
            doc,
            "03 / EINZELBAUTEILE",
            "Korpusblätter",
            `${context.expose.text.cabinetIntro} · Einheiten ${String(index + 1).padStart(2, "0")}–${String(Math.min(index + 2, cabinets.length)).padStart(2, "0")}`,
            context.expose,
            context.projectTitle,
            { minimal: templateId === "minimal" }
        );
        if (templateId === "info") {
            doc.setFillColor(228, 221, 209);
            doc.roundedRect(224, 36, 2.2, 159, 1, 1, "F");
        } else if (templateId === "info-horizontal") {
            doc.setFillColor(228, 221, 209);
            doc.roundedRect(12, 143, 273, 2.2, 1, 1, "F");
        }
        await drawCabinetCard(
            doc,
            cabinets[index],
            index,
            area.x,
            area.y,
            cardWidth,
            cardHeight,
            context,
            getExposeBlockLayout(context.expose, pageId, "cabinetImage:0", cabinetImageFallbacks[0])
        );
        if (cabinets[index + 1]) {
            await drawCabinetCard(
                doc,
                cabinets[index + 1],
                index + 1,
                area.x + cardWidth + cardGap,
                area.y,
                cardWidth,
                cardHeight,
                context,
                getExposeBlockLayout(context.expose, pageId, "cabinetImage:1", cabinetImageFallbacks[1])
            );
        }
        await drawCustomBlocks(doc, context.expose, pageId, context);
        await context.afterPage?.(pageId);
    }
};

const drawCutPlan = (doc, plan, cutPage, x, y, width, height) => {
    doc.setFillColor(239, 237, 231);
    doc.setDrawColor(201, 199, 192);
    doc.roundedRect(x, y, width, height, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.3);
    doc.setTextColor(169, 91, 48);
    doc.text(`SCHNITTFOLGE · ${cutPage.pageIndex + 1}/${cutPage.pageCount}`, x + 6, y + 10);
    doc.setFontSize(11);
    doc.setTextColor(28, 40, 47);
    doc.text(`Platte ${plan.plateNumber}`, x + 6, y + 21);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(91, 102, 107);
    doc.text(`${formatNumber(plan.width)} × ${formatNumber(plan.height)} mm`, x + 6, y + 28);
    doc.setFontSize(5.2);
    doc.text(
        `Schnitte ${cutPage.startNumber || "–"}–${cutPage.endNumber || "–"} von ${cutPage.totalCuts}`,
        x + 6,
        y + 34
    );

    const startY = y + 39;
    const available = height - 45;
    const maximumRows = Math.max(1, ...cutPage.columns.map(column => column.length));
    const rowHeight = Math.min(11.5, available / maximumRows);
    const visibleHeight = Math.max(5.5, rowHeight - 0.8);
    const fontSize = Math.max(4.2, Math.min(6.2, visibleHeight * 0.46));
    const columnGap = cutPage.columnCount === 2 ? 2 : 0;
    const totalWidth = width - 10;
    const columnWidth = (totalWidth - columnGap * (cutPage.columnCount - 1)) / cutPage.columnCount;
    cutPage.columns.forEach((column, columnIndex) => {
        const columnX = x + 5 + columnIndex * (columnWidth + columnGap);
        column.forEach((cut, rowIndex) => {
            const rowY = startY + rowIndex * rowHeight;
            if (rowY + visibleHeight > y + height - 1) return;
            const markerRadius = Math.min(2.7, visibleHeight * 0.34);
            const markerX = columnX + markerRadius + 1.5;
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(209, 208, 202);
            doc.roundedRect(columnX, rowY, columnWidth, visibleHeight, 0.8, 0.8, "FD");
            doc.setFillColor(31, 43, 50);
            doc.circle(markerX, rowY + visibleHeight / 2, markerRadius, "F");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(fontSize);
            doc.setTextColor(255, 255, 255);
            doc.text(String(cut.number), markerX, rowY + visibleHeight / 2 + fontSize * 0.13, { align: "center" });
            doc.setTextColor(33, 46, 53);
            const textX = markerX + markerRadius + 1.3;
            const stripSuffix = cut.stripId == null ? "" : ` · ${String(cut.stripId)}`;
            doc.text(
                cutPage.columnCount === 2
                    ? `${cut.direction === "vertical" ? "V" : "H"} · ${formatNumber(cut.position)} mm${stripSuffix}`
                    : `${cut.direction === "vertical" ? "V" : "H"} · ${cut.directionLabel}${stripSuffix}`,
                textX,
                rowY + Math.max(2.8, visibleHeight * 0.4)
            );
            doc.setFont("helvetica", "normal");
            doc.setTextColor(91, 102, 107);
            doc.text(
                cutPage.columnCount === 2
                    ? `L ${formatNumber(cut.length)} mm`
                    : `${cut.direction === "vertical" ? "X" : "Y"} ${formatNumber(cut.position)} mm · L ${formatNumber(cut.length)} mm`,
                textX,
                rowY + Math.max(5.2, visibleHeight - 1.4)
            );
        });
    });
    if (!plan.cuts.length) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100, 109, 113);
        doc.text(doc.splitTextToSize("Für diese Platte sind noch keine Schnitte vorhanden.", width - 12), x + 6, y + 45);
    }
};

const addCncPages = async (doc, partList, context) => {
    const programs = getCncPrograms(partList);
    const perPage = context.expose.cncProgramsPerPage;
    for (let start = 0; start < programs.length; start += perPage) {
        const pageIndex = start / perPage;
        const pageId = `cnc:${pageIndex}`;
        const templateId = normalizeExposeTemplateId(context.expose.pageTemplates?.[pageId]);
        const pagePrograms = programs.slice(start, start + perPage);
        doc.addPage("a4", "landscape");
        context.renderedPageIds?.push(pageId);
        drawSectionHeader(
            doc,
            "05 / CNC-PROGRAMME",
            "CNC-Programme",
            "Kompakte Linienansichten mit Außenmaßen und vorhandenen Bearbeitungen.",
            context.expose,
            context.projectTitle,
            { minimal: templateId === "minimal" }
        );
        const columns = pagePrograms.length <= 1 ? 1 : 2;
        const rows = Math.ceil(pagePrograms.length / columns);
        const gap = 2.2;
        const area = templateId === "info"
            ? { x: 12, y: 36, width: 205, height: 159 }
            : templateId === "info-horizontal"
                ? { x: 12, y: 36, width: 273, height: 103 }
                : { x: 12, y: 36, width: 273, height: 159 };
        if (templateId === "info") {
            doc.setFillColor(228, 221, 209);
            doc.roundedRect(224, 36, 2.2, 159, 1, 1, "F");
        } else if (templateId === "info-horizontal") {
            doc.setFillColor(228, 221, 209);
            doc.roundedRect(12, 143, 273, 2.2, 1, 1, "F");
        }
        const cardWidth = (area.width - gap * (columns - 1)) / columns;
        const cardHeight = (area.height - gap * (rows - 1)) / rows;
        for (const [index, program] of pagePrograms.entries()) {
            const column = index % columns;
            const row = Math.floor(index / columns);
            const x = area.x + column * (cardWidth + gap);
            const y = area.y + row * (cardHeight + gap);
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(225, 222, 216);
            doc.setLineWidth(0.15);
            doc.roundedRect(x, y, cardWidth, cardHeight, 1.4, 1.4, "FD");
            if (templateId !== "minimal") {
                doc.setFillColor(207, 157, 119);
                doc.rect(x, y, cardWidth, 1.1, "F");
            }
            doc.setFont("helvetica", "bold");
            doc.setFontSize(Math.max(5, Math.min(8, cardHeight / 9)));
            doc.setTextColor(29, 43, 51);
            doc.text(String(program.label).slice(0, 42), x + 4, y + 7);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(4.8);
            doc.setTextColor(102, 112, 117);
            doc.text(`${program.cabinetNames.join(", ") || "CNC-Programm"} · ${program.quantity}×`, x + 4, y + 12);
            const graphic = createCncProgramSvg(program, { showDimensions: false });
            const targetPixels = fitWithin(graphic.width, graphic.height, 1000, 700);
            const raster = await rasterizeSvg(graphic.svg, { width: targetPixels.width, height: targetPixels.height });
            const imageBox = { x: x + 1.5, y: y + 13, width: cardWidth - 3, height: cardHeight - 20 };
            const dimensionSpace = { left: 10, bottom: 9, top: 1, right: 1 };
            const drawingArea = {
                x: imageBox.x + dimensionSpace.left,
                y: imageBox.y + dimensionSpace.top,
                width: Math.max(1, imageBox.width - dimensionSpace.left - dimensionSpace.right),
                height: Math.max(1, imageBox.height - dimensionSpace.top - dimensionSpace.bottom)
            };
            const fitted = fitWithin(graphic.width, graphic.height, drawingArea.width, drawingArea.height);
            const drawingX = drawingArea.x + (drawingArea.width - fitted.width) / 2;
            const drawingY = drawingArea.y + (drawingArea.height - fitted.height) / 2;
            doc.addImage(raster.dataUrl, "PNG", drawingX, drawingY, fitted.width, fitted.height, undefined, "FAST");

            // Draw dimensions in PDF units after scaling the program graphic.
            // Their line width, offsets and font size therefore stay identical
            // across programs with very different aspect ratios.
            const bottomDimensionY = drawingY + fitted.height + 2.4;
            // Match the compact lateral spacing used by the live editor.
            // Keeping this close to the part also prevents the vertical
            // dimension from appearing detached on narrow CNC programs.
            const leftDimensionX = drawingX - 1.4;
            doc.setDrawColor(23, 36, 43);
            doc.setLineWidth(0.28);
            doc.line(drawingX, bottomDimensionY, drawingX + fitted.width, bottomDimensionY);
            doc.line(drawingX, bottomDimensionY - 1.5, drawingX, bottomDimensionY + 1.5);
            doc.line(drawingX + fitted.width, bottomDimensionY - 1.5, drawingX + fitted.width, bottomDimensionY + 1.5);
            doc.line(leftDimensionX, drawingY, leftDimensionX, drawingY + fitted.height);
            doc.line(leftDimensionX - 1.5, drawingY, leftDimensionX + 1.5, drawingY);
            doc.line(leftDimensionX - 1.5, drawingY + fitted.height, leftDimensionX + 1.5, drawingY + fitted.height);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(6.2);
            doc.setTextColor(23, 36, 43);
            doc.text(`${formatNumber(program.part.L)} mm`, drawingX + fitted.width / 2, bottomDimensionY + 3.2, { align: "center" });
            const verticalDimensionText = `${formatNumber(program.part.B)} mm`;
            const verticalDimensionTextWidth = doc.getTextWidth(verticalDimensionText);
            doc.text(verticalDimensionText, leftDimensionX - 1.4, drawingY + fitted.height / 2 + verticalDimensionTextWidth / 2, {
                angle: 90,
                baseline: "middle"
            });
            doc.setFont("helvetica", "bold");
            doc.setFontSize(6.2);
            doc.setTextColor(72, 87, 95);
            const thickness = program.part.D ?? program.part.Staerke;
            doc.text(`${formatNumber(program.part.L)} × ${formatNumber(program.part.B)} × ${thickness == null ? "–" : formatNumber(thickness)} mm · ${(program.part.CNC?.operations ?? []).length} Bearbeitungen`, x + cardWidth / 2, y + cardHeight - 2.8, { align: "center" });
        }
        await drawCustomBlocks(doc, context.expose, pageId, context);
        await context.afterPage?.(pageId);
    }
};

const addManualPage = async (doc, manualPage, context) => {
    const template = normalizeExposeTemplateId(
        context.expose.pageTemplates?.[manualPage.id] ?? manualPage.templateId,
        "title"
    );
    const orientation = manualPage.orientation === "portrait" ? "portrait" : "landscape";
    const pageWidth = orientation === "portrait" ? PORTRAIT_WIDTH : LANDSCAPE_WIDTH;
    const pageHeight = orientation === "portrait" ? PORTRAIT_HEIGHT : LANDSCAPE_HEIGHT;
    doc.addPage("a4", orientation);
    context.renderedPageIds?.push(manualPage.id);
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
    if (template === "info") {
        doc.setFillColor(228, 221, 209);
        doc.roundedRect(pageWidth * 0.754, pageHeight * 0.17, Math.max(1.5, pageWidth * 0.007), pageHeight * 0.76, 1, 1, "F");
    } else if (template === "info-horizontal") {
        doc.setFillColor(228, 221, 209);
        doc.roundedRect(pageWidth * 0.04, pageHeight * 0.705, pageWidth * 0.92, Math.max(1.5, pageHeight * 0.007), 1, 1, "F");
    }
    const pageNumber = doc.getNumberOfPages() - 1;
    drawLayoutText(doc, `${String(pageNumber).padStart(2, "0")} / ${manualPage.eyebrow || "PROJEKTUNTERLAGEN"}`, { x: pageWidth * 0.04, y: pageHeight * 0.05, width: pageWidth * 0.88, height: pageHeight * 0.04 }, { style: "bold", fontSize: 6.5, color: [174, 96, 51], transform: value => value.toUpperCase() });
    drawLayoutText(doc, manualPage.subtitle || "Projektunterlagen", { x: pageWidth * 0.04, y: pageHeight * 0.095, width: pageWidth * 0.88, height: pageHeight * 0.055 }, { fontSize: 7.2, color: [105, 114, 119] });
    if (template === "title") {
        drawLayoutText(doc, manualPage.title || manualPage.label || "Zwischentitel", { x: pageWidth * 0.09, y: pageHeight * 0.37, width: pageWidth * 0.78, height: pageHeight * 0.23 }, { style: "bold", fontSize: 27, color: [27, 42, 50], lineHeightFactor: 1.05 });
    }
    await drawCustomBlocks(doc, context.expose, manualPage.id, context);
    drawFooter(doc, context.expose, context.projectTitle, doc.getNumberOfPages() - 1);
};

const addManualPagesAfter = async (doc, afterPageId, context, visited) => {
    const pages = context.expose.manualPages.filter(page => page.afterPageId === afterPageId && !visited.has(page.id));
    for (const page of pages) {
        visited.add(page.id);
        await addManualPage(doc, page, context);
        await addManualPagesAfter(doc, page.id, context, visited);
    }
};

const addNestingPages = async (doc, nesting, context) => {
    const entries = getNestingPlateEntries(nesting);
    for (const entry of entries) {
        const result = createNestingPlateSvg(entry);
        if (!result) continue;
        const raster = await rasterizeSvg(result.svg, {
            width: result.width * NESTING_RASTER_SCALE,
            height: result.height * NESTING_RASTER_SCALE
        });
        const cutPages = paginateNestingCuts(result.plan.cuts);
        for (const cutPage of cutPages) {
            doc.addPage("a4", "landscape");
            context.renderedPageIds?.push(`nesting:${entry.groupIndex}:${entry.plateIndex}:${cutPage.pageIndex}`);
            drawSectionHeader(
                doc,
                "06 / ZUSCHNITT & NESTING",
                "Nesting & Schnittplan",
                `${context.expose.text.nestingIntro} · ${result.plan.material}${result.plan.thickness == null ? "" : ` · ${formatNumber(result.plan.thickness)} mm`}${cutPage.pageCount > 1 ? ` · Schnittfolge ${cutPage.pageIndex + 1}/${cutPage.pageCount}` : ""}`,
                context.expose,
                context.projectTitle
            );
            drawCutPlan(doc, result.plan, cutPage, 12, 37, 70, 158);
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(190, 193, 193);
            doc.roundedRect(88, 37, 197, 158, 1.5, 1.5, "FD");
            const fitted = fitWithin(raster.width, raster.height, 191, 152);
            doc.addImage(
                raster.dataUrl,
                "PNG",
                91 + (191 - fitted.width) / 2,
                40 + (152 - fitted.height) / 2,
                fitted.width,
                fitted.height,
                undefined,
                "FAST"
            );
            await drawCustomBlocks(
                doc,
                context.expose,
                `nesting:${entry.groupIndex}:${entry.plateIndex}:${cutPage.pageIndex}`,
                context
            );
            await context.afterPage?.(`nesting:${entry.groupIndex}:${entry.plateIndex}:${cutPage.pageIndex}`);
        }
    }
};

const selectedAssets = (assets, ids, expose, pagePrefix) => {
    const enabledAssets = (assets ?? []).filter(asset =>
        isExposePageEnabled(expose, `${pagePrefix}:${asset.id}`)
    );
    if (!Array.isArray(ids) || !ids.length) return enabledAssets;
    const selected = new Set(ids.map(String));
    return enabledAssets.filter(asset => selected.has(String(asset.id)));
};

export async function createProjectPDF({
    createDocument,
    project,
    customer,
    images = [],
    customImageAssets = images,
    viewAssets = [],
    cabinets = [],
    partsList = [],
    nesting = [],
    materials = [],
    cncConfig,
    expose: exposeValue,
    companySettings,
    appendPartsList
}) {
    if (typeof createDocument !== "function") {
        throw new Error("PDF-Dokument konnte nicht initialisiert werden.");
    }

    const doc = createDocument();
    const warnings = [];
    const expose = normalizeExpose(exposeValue);
    const projectTitle = expose.cover.title || project?.title || project?.name || "Projekt";
    const context = {
        expose,
        projectTitle,
        materials,
        cncConfig,
        warnings,
        imageAssets: customImageAssets,
        branding: companySettings?.branding,
        renderedPageIds: []
    };
    const renderedManualPages = new Set();
    context.afterPage = pageId => addManualPagesAfter(doc, pageId, context, renderedManualPages);
    doc.setProperties({
        title: projectTitle,
        subject: "Projektmappe / Exposé",
        author: [customer?.firstName, customer?.lastName].filter(Boolean).join(" ")
    });

    await drawCover(doc, {
        expose,
        project,
        customer,
        branding: companySettings?.branding,
        warnings,
        imageAssets: customImageAssets
    });
    context.renderedPageIds.push("cover");
    await addManualPagesAfter(doc, "cover", context, renderedManualPages);

    if (expose.sections.perspectives !== false) {
        await addVisualPages(doc, selectedAssets(images, expose.selectedImageIds, expose, "image"), {
            section: "01 / PROJEKTEXPOSÉ",
            heading: expose.text.perspectivesHeading,
            body: expose.text.perspectivesBody,
            expose,
            projectTitle,
            warnings,
            pagePrefix: "image",
            imageAssets: customImageAssets,
            branding: companySettings?.branding,
            afterPage: context.afterPage,
            renderedPageIds: context.renderedPageIds
        });
    }
    if (expose.sections.measurement !== false) {
        await addVisualPages(doc, selectedAssets(viewAssets, expose.selectedViewIds, expose, "view"), {
            section: "02 / AUFMASS & PLANUNG",
            heading: expose.text.measurementHeading,
            body: expose.text.measurementBody,
            expose,
            projectTitle,
            warnings,
            pagePrefix: "view",
            imageAssets: customImageAssets,
            branding: companySettings?.branding,
            afterPage: context.afterPage,
            renderedPageIds: context.renderedPageIds
        });
    }
    if (expose.sections.cabinets !== false && cabinets.length) {
        await addCabinetPages(doc, cabinets, context);
    }
    // Die Zuschnittliste bleibt vollständig beim bestehenden Generator.
    if (expose.sections.partsList !== false && partsList.length && typeof appendPartsList === "function") {
        const pageCountBeforePartsList = doc.getNumberOfPages();
        appendPartsList(doc, partsList, { addPage: true, pageNumberOffset: -1 });
        const pageCountAfterPartsList = doc.getNumberOfPages();
        for (let pageIndex = 0; pageIndex < pageCountAfterPartsList - pageCountBeforePartsList; pageIndex += 1) {
            doc.setPage(pageCountBeforePartsList + pageIndex + 1);
            context.renderedPageIds.push(`parts:${pageIndex}`);
            await drawCustomBlocks(doc, expose, `parts:${pageIndex}`, context);
        }
        doc.setPage(pageCountAfterPartsList);
        for (let pageIndex = 0; pageIndex < pageCountAfterPartsList - pageCountBeforePartsList; pageIndex += 1) {
            await context.afterPage(`parts:${pageIndex}`);
        }
    }
    if (expose.sections.cnc !== false && partsList.length) {
        await addCncPages(doc, partsList, context);
    }
    if (expose.sections.nesting !== false && nesting.length) {
        await addNestingPages(doc, nesting, context);
    }
    for (const manualPage of expose.manualPages) {
        if (renderedManualPages.has(manualPage.id)) continue;
        renderedManualPages.add(manualPage.id);
        await addManualPage(doc, manualPage, context);
        await addManualPagesAfter(doc, manualPage.id, context, renderedManualPages);
    }

    doc.deletePage(1);
    if (typeof doc.movePage === "function" && expose.pageOrder.length) {
        const currentOrder = [...context.renderedPageIds];
        const available = new Set(currentOrder);
        const desiredOrder = [
            ...expose.pageOrder.filter(pageId => available.has(pageId)),
            ...currentOrder.filter(pageId => !expose.pageOrder.includes(pageId))
        ];
        desiredOrder.forEach((pageId, targetIndex) => {
            const sourceIndex = currentOrder.indexOf(pageId);
            if (sourceIndex < 0 || sourceIndex === targetIndex) return;
            doc.movePage(sourceIndex + 1, targetIndex + 1);
            currentOrder.splice(targetIndex, 0, currentOrder.splice(sourceIndex, 1)[0]);
        });
        currentOrder.forEach((pageId, index) => {
            if (pageId.startsWith("parts:")) return;
            doc.setPage(index + 1);
            const width = doc.internal.pageSize.getWidth();
            const height = doc.internal.pageSize.getHeight();
            doc.setFillColor(255, 255, 255);
            doc.rect(width - 23, height - 8.2, 12, 5.4, "F");
            doc.setFont("helvetica", "normal");
            doc.setFontSize(5.8);
            doc.setTextColor(105, 111, 114);
            doc.text(String(index + 1).padStart(2, "0"), width - PAGE_MARGIN, height - 5.4, { align: "right" });
            if (pageId.startsWith("manual:")) {
                const manualPage = expose.manualPages.find(page => page.id === pageId);
                doc.setFillColor(255, 255, 255);
                doc.rect(width * 0.035, height * 0.035, width * 0.9, height * 0.06, "F");
                drawLayoutText(doc, `${String(index + 1).padStart(2, "0")} / ${manualPage?.eyebrow || "PROJEKTUNTERLAGEN"}`, { x: width * 0.04, y: height * 0.05, width: width * 0.88, height: height * 0.04 }, { style: "bold", fontSize: 6.5, color: [174, 96, 51], transform: value => value.toUpperCase() });
            }
        });
    }
    doc.save(`${cleanFileName(projectTitle)} - Projektmappe.pdf`);
    return { warnings };
}
