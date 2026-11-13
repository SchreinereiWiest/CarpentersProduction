import os
import unittest
from unittest.mock import Mock, patch

import numpy as np


os.environ.setdefault("MEASUREMENT_OCR_SECRET", "test-secret")

from measurement_ocr import worker  # noqa: E402
from measurement_ocr.pipeline import DecodedPage  # noqa: E402


class MultiPageWorkerTests(unittest.TestCase):
    @patch.object(worker, "extract_fields")
    @patch.object(worker, "rectify_page")
    @patch.object(worker, "decode_identifier")
    @patch.object(worker, "iter_document_pages")
    @patch.object(worker.requests, "get")
    @patch.object(worker, "_post")
    def test_combines_all_pdf_pages_in_one_callback(
        self,
        post,
        get,
        iter_pages,
        decode,
        rectify,
        extract,
    ):
        image = np.full((20, 30, 3), 255, dtype=np.uint8)
        get.return_value = Mock(content=b"pdf", raise_for_status=Mock())
        iter_pages.return_value = [(1, image), (2, image)]
        decode.side_effect = [
            DecodedPage(image, "CPM1:a", 0, 0, 0, []),
            DecodedPage(image, "CPM1:b", 0, 0, 0, []),
        ]
        rectify.side_effect = [
            (image, {"method": "page-resize", "orientationMarkers": []}),
            (image, {"method": "page-resize", "orientationMarkers": []}),
        ]
        extract.side_effect = [
            [{"fieldId": "field-a", "value": "100", "crop": {"inkRatio": 0.1}}],
            [{"fieldId": "field-b", "value": "200", "crop": {"inkRatio": 0.1}}],
        ]
        callback_payloads = []

        def post_side_effect(url, payload):
            if url == "resolve":
                return {
                    "projectId": "project-1",
                    "widthMm": 297,
                    "heightMm": 210,
                    "fields": [],
                }
            callback_payloads.append(payload)
            return {"accepted": True}

        post.side_effect = post_side_effect

        worker.process_job(
            {
                "scanId": "scan-1",
                "tenantId": "tenant-1",
                "downloadUrl": "download",
                "resolveUrl": "resolve",
                "callbackUrl": "callback",
                "mimeType": "application/pdf",
            }
        )

        self.assertEqual(len(callback_payloads), 1)
        payload = callback_payloads[0]
        self.assertEqual([page["sourcePage"] for page in payload["pages"]], [1, 2])
        self.assertEqual(payload["details"]["documentPages"], 2)
        self.assertEqual(payload["details"]["processedPages"], 2)
        self.assertEqual(payload["details"]["fieldCount"], 2)


if __name__ == "__main__":
    unittest.main()
