import unittest
from unittest.mock import patch

import fitz
import numpy as np

from measurement_ocr.pipeline import (
    ScanProcessingError,
    _normalize_page_orientation,
    iter_document_pages,
)


def multipage_pdf(page_count):
    document = fitz.open()
    try:
        for index in range(page_count):
            page = document.new_page(width=297, height=210)
            page.insert_text((20, 20), f"Page {index + 1}")
        return document.tobytes()
    finally:
        document.close()


class PageOrientationTests(unittest.TestCase):
    def test_restores_landscape_page_after_qr_decode_trial_rotation(self):
        # Mirrors the geometry recorded for a real scanner page: OpenCV could
        # decode the QR after a 90° trial rotation, leaving the page portrait
        # and the QR at the lower right.
        image = np.full((2105, 1488, 3), 255, dtype=np.uint8)
        qr_points = np.array(
            [[1461, 1845], [1461, 2015], [1290, 2021], [1290, 1845]],
            dtype=np.float32,
        )

        normalized, points, correction = _normalize_page_orientation(
            image, qr_points
        )

        self.assertEqual(correction, 270)
        self.assertGreater(normalized.shape[1], normalized.shape[0])
        center_x, center_y = points.mean(axis=0)
        self.assertGreater(center_x / normalized.shape[1], 0.8)
        self.assertLess(center_y / normalized.shape[0], 0.2)

    def test_keeps_already_normalized_landscape_page(self):
        image = np.full((1680, 2376, 3), 255, dtype=np.uint8)
        qr_points = np.array(
            [[2100, 50], [2300, 50], [2300, 250], [2100, 250]],
            dtype=np.float32,
        )

        normalized, points, correction = _normalize_page_orientation(
            image, qr_points
        )

        self.assertEqual(correction, 0)
        self.assertEqual(normalized.shape, image.shape)
        np.testing.assert_array_equal(points, qr_points)


class DocumentPageTests(unittest.TestCase):
    def test_streams_every_pdf_page_in_source_order(self):
        pages = list(iter_document_pages(multipage_pdf(3), "application/pdf"))

        self.assertEqual([number for number, _ in pages], [1, 2, 3])
        self.assertTrue(all(image.ndim == 3 for _, image in pages))

    def test_rejects_documents_above_the_configured_page_limit(self):
        with patch.dict("os.environ", {"MEASUREMENT_OCR_MAX_PAGES": "2"}):
            with self.assertRaisesRegex(ScanProcessingError, "maximal 2"):
                list(iter_document_pages(multipage_pdf(3), "application/pdf"))


if __name__ == "__main__":
    unittest.main()
