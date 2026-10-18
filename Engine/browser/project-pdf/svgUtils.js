const FALLBACK_COLOR = "#64748b";

export const finiteNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export const escapeXml = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

export const safeSvgColor = (value, fallback = FALLBACK_COLOR) => {
    const color = String(value ?? "").trim();
    return /^(#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-z]+)$/i.test(color)
        ? color
        : fallback;
};

export const fitWithin = (sourceWidth, sourceHeight, targetWidth, targetHeight) => {
    const width = Math.max(1, finiteNumber(sourceWidth, 1));
    const height = Math.max(1, finiteNumber(sourceHeight, 1));
    const scale = Math.min(targetWidth / width, targetHeight / height);

    return {
        width: width * scale,
        height: height * scale
    };
};

const loadImage = source => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Bild konnte nicht fuer die PDF geladen werden."));
    image.src = source;
});

const createCanvas = (width, height) => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    return canvas;
};

const readBlobAsDataUrl = blob => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Projektbild konnte nicht gelesen werden."));
    reader.readAsDataURL(blob);
});

export async function rasterizeSvg(svg, {
    width = 1000,
    height = 1000
} = {}) {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);

    try {
        const image = await loadImage(objectUrl);
        const canvas = createCanvas(width, height);
        const context = canvas.getContext("2d");

        if (!context) {
            throw new Error("SVG konnte nicht gerastert werden.");
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        return {
            dataUrl: canvas.toDataURL("image/png"),
            width: canvas.width,
            height: canvas.height
        };
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

export async function rasterizeImageBlob(blob, { maxDimension = 2400 } = {}) {
    const objectUrl = URL.createObjectURL(blob);

    try {
        const image = await loadImage(objectUrl);
        const naturalWidth = Math.max(1, image.naturalWidth || image.width || 1);
        const naturalHeight = Math.max(1, image.naturalHeight || image.height || 1);
        const originalFormat = {
            "image/jpeg": "JPEG",
            "image/jpg": "JPEG",
            "image/png": "PNG"
        }[String(blob.type).toLowerCase()];

        // JPEG und PNG werden binaer unveraendert eingebettet. Nur Formate, die
        // jsPDF nicht verlaesslich direkt verarbeitet, werden ueber Canvas gewandelt.
        if (originalFormat) {
            return {
                dataUrl: await readBlobAsDataUrl(blob),
                format: originalFormat,
                width: naturalWidth,
                height: naturalHeight
            };
        }

        const scale = Math.min(1, maxDimension / Math.max(naturalWidth, naturalHeight));
        const canvas = createCanvas(naturalWidth * scale, naturalHeight * scale);
        const context = canvas.getContext("2d");

        if (!context) {
            throw new Error("Projektbild konnte nicht fuer die PDF vorbereitet werden.");
        }

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        return {
            dataUrl: canvas.toDataURL("image/png"),
            format: "PNG",
            width: naturalWidth,
            height: naturalHeight
        };
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}
