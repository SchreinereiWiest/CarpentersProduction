from __future__ import annotations

import os
import re
from collections.abc import Iterator
from dataclasses import dataclass
from typing import Any

import cv2
import fitz
import numpy as np
import pytesseract

from .handwriting import recognize_handwritten_number


IDENTIFIER_PATTERN = re.compile(
    r"^CPM1:[0-9a-f-]{36}:[0-9a-f-]{36}:[0-9a-f-]{36}$", re.IGNORECASE
)


class ScanProcessingError(RuntimeError):
    """Raised when a scan cannot be associated or rectified safely."""


@dataclass
class DecodedPage:
    image: np.ndarray
    identifier: str
    rotation: int
    decode_rotation: int
    orientation_correction: int
    qr_points: list[list[float]]


def _maximum_document_pages() -> int:
    try:
        return min(100, max(1, int(os.getenv("MEASUREMENT_OCR_MAX_PAGES", "50"))))
    except ValueError:
        return 50


def iter_document_pages(
    content: bytes, mime_type: str = ""
) -> Iterator[tuple[int, np.ndarray]]:
    """Yield rasterized document pages sequentially to bound worker memory use."""
    if mime_type == "application/pdf" or content.startswith(b"%PDF-"):
        document = fitz.open(stream=content, filetype="pdf")
        try:
            if document.page_count < 1:
                raise ScanProcessingError("Das PDF enthält keine Seite.")
            maximum = _maximum_document_pages()
            if document.page_count > maximum:
                raise ScanProcessingError(
                    f"Das PDF enthält {document.page_count} Seiten; maximal {maximum} sind erlaubt."
                )
            for page_index in range(document.page_count):
                pixmap = document[page_index].get_pixmap(
                    matrix=fitz.Matrix(2.5, 2.5), alpha=False
                )
                pixels = np.frombuffer(pixmap.samples, dtype=np.uint8)
                image = pixels.reshape(pixmap.height, pixmap.width, pixmap.n)
                yield page_index + 1, cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        finally:
            document.close()
        return

    encoded = np.frombuffer(content, dtype=np.uint8)
    image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    if image is None:
        raise ScanProcessingError("Die Bilddatei konnte nicht gelesen werden.")
    yield 1, image


def _rotate(image: np.ndarray, degrees: int) -> np.ndarray:
    if degrees == 90:
        return cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
    if degrees == 180:
        return cv2.rotate(image, cv2.ROTATE_180)
    if degrees == 270:
        return cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)
    return image


def _rotate_points(
    points: np.ndarray, width: int, height: int, degrees: int
) -> np.ndarray:
    """Rotate QR coordinates with the same geometry as OpenCV's image rotation."""
    if not points.size or degrees == 0:
        return points.copy()
    rotated = points.copy().astype(np.float32)
    x = points[:, 0]
    y = points[:, 1]
    if degrees == 90:
        rotated[:, 0] = height - 1 - y
        rotated[:, 1] = x
    elif degrees == 180:
        rotated[:, 0] = width - 1 - x
        rotated[:, 1] = height - 1 - y
    elif degrees == 270:
        rotated[:, 0] = y
        rotated[:, 1] = width - 1 - x
    return rotated


def _normalize_page_orientation(
    image: np.ndarray, qr_points: np.ndarray
) -> tuple[np.ndarray, np.ndarray, int]:
    """Select landscape orientation with the form QR in its printed top-right corner.

    QRCodeDetector may only decode a QR after rotating the input even though that
    rotation is not the page orientation. Treating its trial rotation as page
    orientation shifts every physical field coordinate to the wrong image area.
    """
    height, width = image.shape[:2]
    best: tuple[float, np.ndarray, np.ndarray, int] | None = None
    for correction in (0, 90, 180, 270):
        candidate = _rotate(image, correction)
        candidate_points = _rotate_points(qr_points, width, height, correction)
        candidate_height, candidate_width = candidate.shape[:2]
        score = 6.0 if candidate_width >= candidate_height else 0.0
        if candidate_points.size:
            center_x, center_y = candidate_points.mean(axis=0)
            normalized_x = center_x / max(1, candidate_width)
            normalized_y = center_y / max(1, candidate_height)
            # The generated form always places the QR in the top-right corner.
            score += normalized_x + (1.0 - normalized_y)
            if normalized_x >= 0.5:
                score += 2.0
            if normalized_y <= 0.5:
                score += 2.0
        if best is None or score > best[0]:
            best = (score, candidate, candidate_points, correction)
    assert best is not None
    return best[1], best[2], best[3]


def decode_identifier(image: np.ndarray) -> DecodedPage:
    """Find the printed identifier and normalize the scan's coarse rotation."""
    detector = cv2.QRCodeDetector()
    for rotation in (0, 90, 180, 270):
        rotated = _rotate(image, rotation)
        value, points, _ = detector.detectAndDecode(rotated)
        value = value.strip()
        if value and IDENTIFIER_PATTERN.fullmatch(value):
            detected_points = (
                points.reshape(-1, 2).astype(np.float32)
                if points is not None
                else np.empty((0, 2), dtype=np.float32)
            )
            normalized, normalized_points, correction = _normalize_page_orientation(
                rotated, detected_points
            )
            return DecodedPage(
                normalized,
                value,
                (rotation + correction) % 360,
                rotation,
                correction,
                normalized_points.tolist(),
            )
    raise ScanProcessingError("Kein gültiger Aufmaß-QR-Identifier erkannt.")


def _ordered_quad(points: np.ndarray) -> np.ndarray:
    ordered = np.zeros((4, 2), dtype=np.float32)
    sums = points.sum(axis=1)
    differences = np.diff(points, axis=1).reshape(-1)
    ordered[0] = points[np.argmin(sums)]
    ordered[2] = points[np.argmax(sums)]
    ordered[1] = points[np.argmin(differences)]
    ordered[3] = points[np.argmax(differences)]
    return ordered


def _document_quad(image: np.ndarray) -> np.ndarray | None:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 45, 135)
    edges = cv2.dilate(edges, np.ones((5, 5), np.uint8), iterations=1)
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    image_area = float(image.shape[0] * image.shape[1])
    for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:20]:
        if cv2.contourArea(contour) < image_area * 0.35:
            continue
        perimeter = cv2.arcLength(contour, True)
        polygon = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
        if len(polygon) == 4:
            return _ordered_quad(polygon.reshape(4, 2).astype(np.float32))
    return None


def _marker_centers(image: np.ndarray) -> list[list[float]]:
    """Report the four solid orientation markers after rectification."""
    height, width = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 80, 255, cv2.THRESH_BINARY_INV)
    result: list[list[float]] = []
    regions = (
        (0, 0, int(width * 0.12), int(height * 0.12)),
        (int(width * 0.88), 0, width, int(height * 0.12)),
        (0, int(height * 0.88), int(width * 0.12), height),
        (int(width * 0.88), int(height * 0.88), width, height),
    )
    for left, top, right, bottom in regions:
        roi = binary[top:bottom, left:right]
        contours, _ = cv2.findContours(roi, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        squares = []
        for contour in contours:
            x, y, box_width, box_height = cv2.boundingRect(contour)
            area = cv2.contourArea(contour)
            if area < 20 or box_height == 0:
                continue
            ratio = box_width / box_height
            if 0.65 <= ratio <= 1.35:
                squares.append((area, left + x + box_width / 2, top + y + box_height / 2))
        if squares:
            _, x, y = max(squares)
            result.append([round(x, 2), round(y, 2)])
    return result


def rectify_page(
    image: np.ndarray, width_mm: float, height_mm: float, pixels_per_mm: float = 8.0
) -> tuple[np.ndarray, dict[str, Any]]:
    """Deskew the page into the physical coordinate system used by the PDF."""
    target_width = max(1200, int(round(width_mm * pixels_per_mm)))
    target_height = max(850, int(round(height_mm * pixels_per_mm)))
    quad = _document_quad(image)
    if quad is None:
        # QR rotation is already normalized. This fallback remains deterministic
        # for scanner-produced images that contain no visible paper boundary.
        rectified = cv2.resize(image, (target_width, target_height), interpolation=cv2.INTER_CUBIC)
        method = "page-resize"
        source_quad: list[list[float]] = []
    else:
        destination = np.array(
            [[0, 0], [target_width - 1, 0], [target_width - 1, target_height - 1], [0, target_height - 1]],
            dtype=np.float32,
        )
        matrix = cv2.getPerspectiveTransform(quad, destination)
        rectified = cv2.warpPerspective(
            image, matrix, (target_width, target_height), borderValue=(255, 255, 255)
        )
        method = "document-homography"
        source_quad = quad.tolist()
    return rectified, {
        "method": method,
        "sourceQuad": source_quad,
        "targetPixels": [target_width, target_height],
        "pixelsPerMm": pixels_per_mm,
        "orientationMarkers": _marker_centers(rectified),
    }


def _clean_numeric(text: str) -> str | None:
    compact = text.strip().replace(" ", "").replace(",", ".")
    compact = compact.replace("O", "0").replace("o", "0")
    match = re.search(r"-?\d+(?:\.\d+)?", compact)
    return match.group(0) if match else None


def recognize_field(crop: np.ndarray) -> tuple[str, str | None, float | None]:
    """Recognize one isolated field, with Tesseract as compatibility fallback."""
    handwritten = recognize_handwritten_number(crop)
    if handwritten is not None:
        return handwritten
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, None, fx=2.2, fy=2.2, interpolation=cv2.INTER_CUBIC)
    gray = cv2.medianBlur(gray, 3)
    binary = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 41, 13
    )
    data = pytesseract.image_to_data(
        binary,
        config="--oem 1 --psm 7 -c tessedit_char_whitelist=0123456789,.-",
        output_type=pytesseract.Output.DICT,
    )
    fragments = [value for value in data.get("text", []) if value.strip()]
    confidences = []
    for value in data.get("conf", []):
        try:
            confidence = float(value)
        except (TypeError, ValueError):
            continue
        if confidence >= 0:
            confidences.append(confidence / 100.0)
    raw_text = "".join(fragments)
    value = _clean_numeric(raw_text)
    confidence = max(confidences) if value is not None and confidences else None
    return raw_text, value, confidence


def _ink_ratio(crop: np.ndarray) -> float:
    """Estimate visible pen/print coverage for diagnostics without storing images."""
    if crop.size == 0:
        return 0.0
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    dark_pixels = np.count_nonzero(gray < 180)
    return float(dark_pixels) / float(gray.size)


def extract_fields(
    image: np.ndarray, fields: list[dict[str, Any]], width_mm: float, height_mm: float
) -> list[dict[str, Any]]:
    height, width = image.shape[:2]
    scale_x = width / width_mm
    scale_y = height / height_mm
    results = []
    for field in fields:
        # Printed fields are deliberately blank. Remove only the rectangle
        # border and retain the complete inner writing area for OCR.
        inset_mm = 1.0
        x1 = int(round((float(field["xMm"]) + inset_mm) * scale_x))
        y1 = int(round((float(field["yMm"]) + inset_mm) * scale_y))
        x2 = int(round((float(field["xMm"]) + float(field["widthMm"]) - inset_mm) * scale_x))
        y2 = int(round((float(field["yMm"]) + float(field["heightMm"]) - inset_mm) * scale_y))
        x1, x2 = max(0, x1), min(width, x2)
        y1, y2 = max(0, y1), min(height, y2)
        if x2 - x1 < 10 or y2 - y1 < 10:
            raw_text, value, confidence = "", None, None
            ink_ratio = 0.0
        else:
            crop = image[y1:y2, x1:x2]
            ink_ratio = _ink_ratio(crop)
            raw_text, value, confidence = recognize_field(crop)
        results.append(
            {
                "fieldId": str(field["id"]),
                "rawText": raw_text,
                "value": value,
                "confidence": round(confidence, 4) if confidence is not None else None,
                "crop": {
                    "x": x1,
                    "y": y1,
                    "width": max(0, x2 - x1),
                    "height": max(0, y2 - y1),
                    "inkRatio": round(ink_ratio, 6),
                },
            }
        )
    return results
