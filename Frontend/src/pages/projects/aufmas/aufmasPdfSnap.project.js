const ANALYSIS_MAX_WIDTH = 1400;
const ANALYSIS_MAX_HEIGHT = 1000;
const DEFAULT_MAX_POINTS = 500;

const localDarkPixel = (dark, width, height, x, y) => {
    const centerX = Math.round(x);
    const centerY = Math.round(y);
    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
            const nextX = centerX + offsetX;
            const nextY = centerY + offsetY;
            if (nextX >= 0 && nextX < width && nextY >= 0 && nextY < height && dark[nextY * width + nextX]) return true;
        }
    }
    return false;
};

const branchCount = (dark, width, height, x, y, armLength) => {
    const directions = 24;
    const active = [];
    for (let direction = 0; direction < directions; direction += 1) {
        const angle = direction / directions * Math.PI * 2;
        let hits = 0;
        let samples = 0;
        for (let radius = 3; radius <= armLength; radius += 1) {
            samples += 1;
            if (localDarkPixel(dark, width, height, x + Math.cos(angle) * radius, y + Math.sin(angle) * radius)) hits += 1;
        }
        active.push(hits / Math.max(samples, 1) >= 0.68);
    }

    let branches = 0;
    for (let index = 0; index < directions; index += 1) {
        const previous = active[(index + directions - 1) % directions];
        if (active[index] && !previous) branches += 1;
    }
    return branches;
};

const integralValue = (integral, stride, x, y) => integral[y * stride + x];
const areaSum = (integral, stride, left, top, right, bottom) => (
    integralValue(integral, stride, right + 1, bottom + 1)
    - integralValue(integral, stride, left, bottom + 1)
    - integralValue(integral, stride, right + 1, top)
    + integralValue(integral, stride, left, top)
);

export function detectPdfSnapPoints(imageData, {
    maxPoints = DEFAULT_MAX_POINTS,
    minDistance = 12,
    minBranches = 2,
    darknessThreshold = 225
} = {}) {
    const { data, width, height } = imageData;
    if (width < 12 || height < 12) return [];

    const pixelCount = width * height;
    const gray = new Float32Array(pixelCount);
    const dark = new Uint8Array(pixelCount);
    for (let index = 0; index < pixelCount; index += 1) {
        const offset = index * 4;
        const luminance = data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722;
        gray[index] = luminance;
        dark[index] = luminance < darknessThreshold && data[offset + 3] > 24 ? 1 : 0;
    }

    const stride = width + 1;
    const integralSize = stride * (height + 1);
    const integralX = new Float32Array(integralSize);
    const integralY = new Float32Array(integralSize);
    const integralXY = new Float32Array(integralSize);
    for (let y = 1; y < height - 1; y += 1) {
        let rowX = 0;
        let rowY = 0;
        let rowXY = 0;
        for (let x = 1; x < width - 1; x += 1) {
            const index = y * width + x;
            const gradientX = gray[index + 1] - gray[index - 1];
            const gradientY = gray[index + width] - gray[index - width];
            rowX += gradientX * gradientX;
            rowY += gradientY * gradientY;
            rowXY += gradientX * gradientY;
            const integralIndex = (y + 1) * stride + x + 1;
            integralX[integralIndex] = integralX[y * stride + x + 1] + rowX;
            integralY[integralIndex] = integralY[y * stride + x + 1] + rowY;
            integralXY[integralIndex] = integralXY[y * stride + x + 1] + rowXY;
        }
    }

    const responses = new Float32Array(pixelCount);
    let maximumResponse = 0;
    const windowRadius = 2;
    for (let y = windowRadius + 2; y < height - windowRadius - 2; y += 1) {
        for (let x = windowRadius + 2; x < width - windowRadius - 2; x += 1) {
            const left = x - windowRadius;
            const top = y - windowRadius;
            const right = x + windowRadius;
            const bottom = y + windowRadius;
            const sumX = areaSum(integralX, stride, left, top, right, bottom);
            const sumY = areaSum(integralY, stride, left, top, right, bottom);
            const sumXY = areaSum(integralXY, stride, left, top, right, bottom);
            const determinant = sumX * sumY - sumXY * sumXY;
            const trace = sumX + sumY;
            const response = determinant - 0.045 * trace * trace;
            if (response > 0) {
                responses[y * width + x] = response;
                maximumResponse = Math.max(maximumResponse, response);
            }
        }
    }
    if (!maximumResponse) return [];

    const threshold = maximumResponse * 0.006;
    const armLength = Math.max(8, Math.round(Math.min(width, height) * 0.015));
    const candidates = [];
    // Do not skip pixels. The exact corner of a 0.2 mm stroke can otherwise
    // fall between two samples after rasterisation.
    for (let y = 4; y < height - 4; y += 1) {
        for (let x = 4; x < width - 4; x += 1) {
            const response = responses[y * width + x];
            if (response < threshold) continue;
            let isMaximum = true;
            for (let offsetY = -2; offsetY <= 2 && isMaximum; offsetY += 1) {
                for (let offsetX = -2; offsetX <= 2; offsetX += 1) {
                    if (responses[(y + offsetY) * width + x + offsetX] > response) {
                        isMaximum = false;
                        break;
                    }
                }
            }
            if (!isMaximum) continue;
            const branches = branchCount(dark, width, height, x, y, armLength);
            if (branches < minBranches || branches > 6) continue;
            candidates.push({ x, y, branches, confidence: response / maximumResponse });
        }
    }

    candidates.sort((first, second) => second.confidence - first.confidence);
    const accepted = [];
    const minimumDistanceSquared = minDistance * minDistance;
    for (const candidate of candidates) {
        if (accepted.some(point => (point.x - candidate.x) ** 2 + (point.y - candidate.y) ** 2 < minimumDistanceSquared)) continue;
        accepted.push(candidate);
        if (accepted.length >= maxPoints) break;
    }
    return accepted;
}

const loadImage = source => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("PDF-Raster konnte nicht analysiert werden"));
    image.src = source;
});

const containRect = (sourceWidth, sourceHeight, target) => {
    const scale = Math.min(target.width / sourceWidth, target.height / sourceHeight);
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;
    return {
        x: target.x + (target.width - width) / 2,
        y: target.y + (target.height - height) / 2,
        width,
        height
    };
};

export async function derivePdfSnapPoints(planPage) {
    if (!planPage?.dataUrl) return { points: [], stats: { detected: 0 } };
    const image = await loadImage(planPage.dataUrl);
    const analysisScale = Math.min(1, ANALYSIS_MAX_WIDTH / image.naturalWidth, ANALYSIS_MAX_HEIGHT / image.naturalHeight);
    const canvas = window.document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * analysisScale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * analysisScale));
    const context = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const detected = detectPdfSnapPoints(context.getImageData(0, 0, canvas.width, canvas.height));
    const displayRect = containRect(planPage.width, planPage.height, { x: 54, y: 54, width: 892, height: 542 });
    const points = detected.map(point => ({
        x: displayRect.x + point.x / canvas.width * displayRect.width,
        y: displayRect.y + point.y / canvas.height * displayRect.height,
        branches: point.branches,
        confidence: point.confidence,
        source: "pdf"
    }));
    return {
        points,
        stats: {
            detected: points.length,
            analysisWidth: canvas.width,
            analysisHeight: canvas.height,
            minBranches: 2,
            limited: points.length >= DEFAULT_MAX_POINTS
        }
    };
}
