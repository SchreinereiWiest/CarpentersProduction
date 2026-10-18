import {
    createCabinetSvg,
    getCabinetFunctionLines,
    getCabinetInformation
} from "./cabinetSvgRenderer.js";
import { createNestingOverviewSvg } from "./nestingSvgRenderer.js";
import { fitWithin, rasterizeImageBlob, rasterizeSvg } from "./svgUtils.js";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const PAGE_MARGIN = 10;
const NESTING_RASTER_SCALE = 2.5;

const cleanFileName = value => String(value || "Projekt")
    .split("")
    .map(character => character.charCodeAt(0) < 32 ? "-" : character)
    .join("")
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

export const getImagePageLayout = (width, height) => {
    const landscape = Number(width) > Number(height);

    if (landscape) {
        return {
            orientation: "landscape",
            pageWidth: PAGE_HEIGHT,
            pageHeight: PAGE_WIDTH,
            x: 0,
            y: 0,
            width: PAGE_HEIGHT,
            height: PAGE_WIDTH
        };
    }

    const fitted = fitWithin(
        width,
        height,
        PAGE_WIDTH - PAGE_MARGIN * 2,
        PAGE_HEIGHT - PAGE_MARGIN * 2
    );

    return {
        orientation: "portrait",
        pageWidth: PAGE_WIDTH,
        pageHeight: PAGE_HEIGHT,
        x: (PAGE_WIDTH - fitted.width) / 2,
        y: (PAGE_HEIGHT - fitted.height) / 2,
        width: fitted.width,
        height: fitted.height
    };
};

const addProjectImagePages = async (doc, images, warnings) => {
    for (const image of images ?? []) {
        try {
            const raster = await rasterizeImageBlob(image.blob);
            const layout = getImagePageLayout(raster.width, raster.height);
            doc.addPage("a4", layout.orientation);
            doc.addImage(
                raster.dataUrl,
                raster.format,
                layout.x,
                layout.y,
                layout.width,
                layout.height,
                undefined,
                "FAST"
            );
        } catch (error) {
            warnings.push(`${image.name || "Projektbild"}: ${error.message}`);
        }
    }
};

const drawWrappedLines = (doc, lines, x, startY, width, maxY) => {
    const availableHeight = Math.max(1, maxY - startY);
    let fontSize = 8.2;
    let wrappedLines = [];
    let heightUnits = 1;

    doc.setFont("helvetica", "normal");

    const createLayout = size => {
        doc.setFontSize(size);
        wrappedLines = lines.map(line => doc.splitTextToSize(line, width));
        heightUnits = wrappedLines.reduce((total, wrapped) => (
            total + wrapped.length + 0.28
        ), 0);
    };

    createLayout(fontSize);
    while (fontSize > 3.5 && heightUnits * fontSize * 0.46 > availableHeight) {
        fontSize -= 0.25;
        createLayout(fontSize);
    }

    if (heightUnits * fontSize * 0.46 > availableHeight) {
        fontSize = availableHeight / Math.max(1, heightUnits) / 0.46;
        createLayout(fontSize);
    }

    const lineHeight = fontSize * 0.46;
    let y = startY;

    doc.setFontSize(fontSize);
    doc.setTextColor(55, 65, 81);

    wrappedLines.forEach(wrapped => {
        wrapped.forEach(part => {
            doc.text(part, x, y);
            y += lineHeight;
        });
        y += lineHeight * 0.28;
    });
};

const drawCabinetSlot = async (doc, cabinet, index, y, slotHeight, context) => {
    const drawingBox = { x: 10, y: y + 13, width: 94, height: slotHeight - 20 };
    const infoX = 112;
    const infoWidth = 88;
    const maxY = y + slotHeight - 5;
    const title = cabinet.name || `Korpus ${index + 1}`;
    const svg = createCabinetSvg(cabinet, { cncConfig: context.cncConfig });
    const targetPixels = fitWithin(svg.width, svg.height, 850, 1050);
    const raster = await rasterizeSvg(svg.svg, {
        width: targetPixels.width,
        height: targetPixels.height
    });
    const fitted = fitWithin(svg.width, svg.height, drawingBox.width, drawingBox.height);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55);
    doc.text(title, 10, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(107, 114, 128);
    doc.text(context.projectTitle, PAGE_WIDTH - 10, y + 8, { align: "right" });

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

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(31, 41, 55);
    doc.text("Korpusinformationen", infoX, y + 16);

    const information = getCabinetInformation(cabinet, context.materials)
        .map(([label, value]) => `${label}: ${value}`);
    const functions = getCabinetFunctionLines(cabinet);
    const lines = [
        ...information,
        "",
        "Funktionen:",
        ...(functions.length ? functions.map(line => `• ${line}`) : ["• Keine Funktionen"])
    ];

    drawWrappedLines(doc, lines, infoX, y + 21, infoWidth, maxY);
};

const addCabinetPages = async (doc, cabinets, context) => {
    const slotMargin = 8;
    const slotHeight = (PAGE_HEIGHT - slotMargin * 2) / 2;

    for (let index = 0; index < cabinets.length; index += 2) {
        doc.addPage("a4", "portrait");
        await drawCabinetSlot(doc, cabinets[index], index, slotMargin, slotHeight, context);

        if (cabinets[index + 1]) {
            doc.setDrawColor(209, 213, 219);
            doc.setLineWidth(0.25);
            doc.line(10, PAGE_HEIGHT / 2, PAGE_WIDTH - 10, PAGE_HEIGHT / 2);
            await drawCabinetSlot(
                doc,
                cabinets[index + 1],
                index + 1,
                slotMargin + slotHeight,
                slotHeight,
                context
            );
        }
    }
};

const addNestingPage = async (doc, nesting, projectTitle) => {
    const overview = createNestingOverviewSvg(nesting);
    if (!overview) return false;

    const raster = await rasterizeSvg(overview.svg, {
        width: overview.width * NESTING_RASTER_SCALE,
        height: overview.height * NESTING_RASTER_SCALE
    });
    const fitted = fitWithin(raster.width, raster.height, PAGE_WIDTH - 20, PAGE_HEIGHT - 30);
    doc.addPage("a4", "portrait");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(31, 41, 55);
    doc.text("Nesting-Übersicht", 10, 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text(`${projectTitle} · ${overview.count} Platten`, PAGE_WIDTH - 10, 12, { align: "right" });
    doc.addImage(
        raster.dataUrl,
        "PNG",
        (PAGE_WIDTH - fitted.width) / 2,
        20,
        fitted.width,
        fitted.height,
        undefined,
        "FAST"
    );
    return true;
};

const addEmptyProjectPage = (doc, projectTitle) => {
    doc.addPage("a4", "portrait");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(31, 41, 55);
    doc.text(projectTitle, 15, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text("Für dieses Projekt sind noch keine druckbaren Daten vorhanden.", 15, 30);
};

export async function createProjectPDF({
    createDocument,
    project,
    customer,
    images = [],
    cabinets = [],
    partsList = [],
    nesting = [],
    materials = [],
    cncConfig,
    appendPartsList
}) {
    if (typeof createDocument !== "function") {
        throw new Error("PDF-Dokument konnte nicht initialisiert werden.");
    }

    const doc = createDocument();
    const warnings = [];
    const projectTitle = project?.title || "Projekt";
    let contentSections = 0;

    doc.setProperties({
        title: projectTitle,
        subject: "Projektunterlagen",
        author: [customer?.firstName, customer?.lastName].filter(Boolean).join(" ")
    });

    await addProjectImagePages(doc, images, warnings);
    if (images.length > warnings.length) contentSections += 1;

    if (cabinets.length) {
        await addCabinetPages(doc, cabinets, { projectTitle, materials, cncConfig });
        contentSections += 1;
    }

    if (partsList.length && typeof appendPartsList === "function") {
        appendPartsList(doc, partsList, { addPage: true });
        contentSections += 1;
    }

    if (await addNestingPage(doc, nesting, projectTitle)) {
        contentSections += 1;
    }

    if (!contentSections) {
        addEmptyProjectPage(doc, projectTitle);
    }

    // jsPDF startet mit einer leeren Seite; alle Projektbereiche werden bewusst
    // als eigene Seiten angelegt, daher wird nur diese Initialseite entfernt.
    doc.deletePage(1);
    doc.save(`${cleanFileName(projectTitle)} - Projekt.pdf`);

    return { warnings };
}
