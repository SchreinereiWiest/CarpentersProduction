from __future__ import annotations

import logging
import os
from pathlib import Path

import cv2
import numpy as np


LOGGER = logging.getLogger(__name__)
MODEL_PATH = Path(
    os.getenv("MEASUREMENT_OCR_DIGIT_MODEL", "/service/models/mnist.onnx")
)
_NETWORK: cv2.dnn.Net | None = None
_MODEL_FAILED = False


def _network() -> cv2.dnn.Net | None:
    global _NETWORK, _MODEL_FAILED
    if _NETWORK is not None:
        return _NETWORK
    if _MODEL_FAILED:
        return None
    try:
        _NETWORK = cv2.dnn.readNetFromONNX(str(MODEL_PATH))
        return _NETWORK
    except cv2.error:
        _MODEL_FAILED = True
        LOGGER.exception("handwriting digit model could not be loaded path=%s", MODEL_PATH)
        return None


def _digit_boxes(binary: np.ndarray) -> list[tuple[int, int, int, int]]:
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    minimum_height = max(12, round(binary.shape[0] * 0.22))
    boxes = sorted(
        [
            cv2.boundingRect(contour)
            for contour in contours
            if cv2.contourArea(contour) >= 20
            and cv2.boundingRect(contour)[3] >= minimum_height
        ],
        key=lambda box: box[0],
    )
    if not boxes:
        return []

    regular_widths = [
        width for _, _, width, height in boxes if width <= height * 1.25
    ]
    typical_width = float(np.median(regular_widths)) if regular_widths else 35.0
    split: list[tuple[int, int, int, int]] = []
    for x, y, width, height in boxes:
        parts = max(1, round(width / max(typical_width, height * 0.65)))
        if parts == 1:
            split.append((x, y, width, height))
            continue

        cuts = [round(width * index / parts) for index in range(1, parts)]
        starts = [0, *cuts]
        ends = [*cuts, width]
        overlap = max(2, round(width / parts * 0.16))
        for start, end in zip(starts, ends):
            part_start = max(0, start - overlap)
            part_end = min(width, end + overlap)
            split.append((x + part_start, y, part_end - part_start, height))
    return split


def _softmax(values: np.ndarray) -> np.ndarray:
    shifted = values - values.max()
    exponentials = np.exp(shifted)
    return exponentials / exponentials.sum()


def _predict_digit(
    network: cv2.dnn.Net,
    binary: np.ndarray,
    box: tuple[int, int, int, int],
) -> tuple[int, float, np.ndarray]:
    x, y, width, height = box
    digit = binary[y : y + height, x : x + width]
    inner_size = 20
    scale = min(inner_size / max(1, width), inner_size / max(1, height))
    resized = cv2.resize(
        digit,
        (max(1, round(width * scale)), max(1, round(height * scale))),
        interpolation=cv2.INTER_AREA,
    )
    canvas = np.zeros((28, 28), dtype=np.uint8)
    offset_x = (28 - resized.shape[1]) // 2
    offset_y = (28 - resized.shape[0]) // 2
    canvas[
        offset_y : offset_y + resized.shape[0],
        offset_x : offset_x + resized.shape[1],
    ] = resized

    moments = cv2.moments(canvas)
    if moments["m00"]:
        center_x = moments["m10"] / moments["m00"]
        center_y = moments["m01"] / moments["m00"]
        matrix = np.float32(
            [[1, 0, 13.5 - center_x], [0, 1, 13.5 - center_y]]
        )
        canvas = cv2.warpAffine(canvas, matrix, (28, 28))

    network.setInput(canvas.astype(np.float32).reshape(1, 1, 28, 28) / 255.0)
    probabilities = _softmax(network.forward().reshape(-1))
    prediction = int(np.argmax(probabilities))

    # A handwritten 7 without a lower bar is the model's most common 2/7
    # ambiguity. A handwritten 2 normally has substantially more lower ink.
    lower = digit[round(height * 0.75) :, :]
    lower_density = float(np.count_nonzero(lower)) / max(1, lower.size)
    if prediction == 2 and probabilities[7] >= 0.2 and lower_density < 0.12:
        prediction = 7
    return prediction, float(probabilities[prediction]), probabilities


def recognize_handwritten_number(
    crop: np.ndarray,
) -> tuple[str, str, float] | None:
    """Segment and classify handwritten digits with the local ONNX model."""
    network = _network()
    if network is None or crop.size == 0:
        return None
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(
        gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
    )
    boxes = _digit_boxes(binary)
    if not boxes:
        return None

    predictions = [[*_predict_digit(network, binary, box), box] for box in boxes]
    if len(predictions) > 1:
        first_digit, first_confidence, _, first_box = predictions[0]
        other_heights = [item[3][3] for item in predictions[1:]]
        # A leading handwritten 1 is often shorter than the following digits
        # and otherwise resembles a 7 in MNIST. Keep this correction visibly
        # uncertain so the control view still draws attention to it.
        if (
            first_digit == 7
            and first_box[3] < float(np.median(other_heights)) * 0.85
        ):
            predictions[0][0] = 1
            predictions[0][1] = min(float(first_confidence), 0.45)

    text = "".join(str(item[0]) for item in predictions)
    confidence = min(float(item[1]) for item in predictions)
    return text, text, confidence
