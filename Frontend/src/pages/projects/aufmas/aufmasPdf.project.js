import * as pdfjs from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function cropWhiteMargins(canvas) {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const { width, height } = canvas;
    const pixels = context.getImageData(0, 0, width, height).data;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    // Scan every pixel: a 0.2 mm vector stroke may rasterise to one pixel.
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const index = (y * width + x) * 4;
            if (pixels[index + 3] > 16 && (pixels[index] < 242 || pixels[index + 1] < 242 || pixels[index + 2] < 242)) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }

    if (minX >= maxX || minY >= maxY) return canvas;
    const margin = Math.max(8, Math.round(Math.min(width, height) * 0.015));
    minX = Math.max(0, minX - margin);
    minY = Math.max(0, minY - margin);
    maxX = Math.min(width, maxX + margin);
    maxY = Math.min(height, maxY + margin);
    const cropped = window.document.createElement("canvas");
    cropped.width = maxX - minX;
    cropped.height = maxY - minY;
    cropped.getContext("2d", { alpha: false }).drawImage(canvas, minX, minY, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
    return cropped;
}

export async function renderPdfPages(source, { scale = 2 } = {}) {
    const data = source instanceof ArrayBuffer ? source : await source.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data });
    const pdfDocument = await loadingTask.promise;
    const pages = [];

    try {
        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
            const page = await pdfDocument.getPage(pageNumber);
            const viewport = page.getViewport({ scale });
            const canvas = window.document.createElement("canvas");
            const context = canvas.getContext("2d", { alpha: false });
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            await page.render({ canvasContext: context, canvas, viewport }).promise;
            const croppedCanvas = cropWhiteMargins(canvas);
            pages.push({
                pageNumber,
                width: croppedCanvas.width,
                height: croppedCanvas.height,
                // Lossless output preserves thin technical lines without JPEG artefacts.
                dataUrl: croppedCanvas.toDataURL("image/png")
            });
            page.cleanup?.();
        }
        return pages;
    } finally {
        await loadingTask.destroy();
    }
}
