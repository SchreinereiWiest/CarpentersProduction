from __future__ import annotations

import json
import logging
import os
import time
from typing import Any

import redis
import requests

from .pipeline import (
    ScanProcessingError,
    decode_identifier,
    extract_fields,
    iter_document_pages,
    rectify_page,
)


logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s measurement-ocr %(message)s",
)
LOGGER = logging.getLogger(__name__)
QUEUE = os.getenv("MEASUREMENT_OCR_QUEUE", "measurement:ocr:jobs")
SECRET = os.environ["MEASUREMENT_OCR_SECRET"]
VALKEY_URL = os.getenv("VALKEY_URL", "redis://valkey:6379/0")


def _worker_headers() -> dict[str, str]:
    return {"x-measurement-ocr-secret": SECRET, "content-type": "application/json"}


def _post(url: str, payload: dict[str, Any]) -> dict[str, Any]:
    response = requests.post(url, headers=_worker_headers(), json=payload, timeout=30)
    response.raise_for_status()
    return response.json()


def process_job(job: dict[str, Any]) -> None:
    scan_id = str(job["scanId"])
    tenant_id = str(job["tenantId"])
    LOGGER.info("processing scan=%s", scan_id)
    try:
        response = requests.get(job["downloadUrl"], timeout=90)
        response.raise_for_status()
        processed_pages = []
        page_errors = []
        project_ids = set()
        identifiers = set()
        total_fields = 0
        recognized_count = 0
        inked_count = 0
        document_pages = 0

        for source_page, source in iter_document_pages(
            response.content, str(job.get("mimeType") or "")
        ):
            document_pages += 1
            try:
                decoded = decode_identifier(source)
                if decoded.identifier in identifiers:
                    raise ScanProcessingError("Der Seiten-Identifier ist im PDF doppelt enthalten.")
                page = _post(
                    job["resolveUrl"],
                    {"tenantId": tenant_id, "identifier": decoded.identifier},
                )
                identifiers.add(decoded.identifier)
                page_project_id = str(page["projectId"])
                if project_ids and page_project_id not in project_ids:
                    raise ScanProcessingError(
                        "Ein mehrseitiger Upload darf nur Aufmaßseiten desselben Projekts enthalten."
                    )
                project_ids.add(page_project_id)
                rectified, alignment = rectify_page(
                    decoded.image, float(page["widthMm"]), float(page["heightMm"])
                )
                alignment.update(
                    {
                        "sourcePage": source_page,
                        "qrRotation": decoded.rotation,
                        "qrDecodeRotation": decoded.decode_rotation,
                        "orientationCorrection": decoded.orientation_correction,
                        "qrPoints": decoded.qr_points,
                        "identifier": decoded.identifier,
                    }
                )
                items = extract_fields(
                    rectified,
                    list(page.get("fields") or []),
                    float(page["widthMm"]),
                    float(page["heightMm"]),
                )
                total_fields += len(items)
                recognized_count += sum(
                    1 for item in items if item.get("value") is not None
                )
                inked_count += sum(
                    1
                    for item in items
                    if float((item.get("crop") or {}).get("inkRatio") or 0) >= 0.002
                )
                processed_pages.append(
                    {
                        "sourcePage": source_page,
                        "identifier": decoded.identifier,
                        "alignment": alignment,
                        "items": items,
                    }
                )
            except Exception as page_error:
                LOGGER.exception(
                    "scan page failed scan=%s source_page=%d", scan_id, source_page
                )
                page_errors.append(
                    {"sourcePage": source_page, "error": str(page_error)[:500]}
                )

        if not processed_pages:
            reasons = "; ".join(
                f"Seite {entry['sourcePage']}: {entry['error']}" for entry in page_errors
            )
            raise ScanProcessingError(
                f"Keine PDF-Seite konnte verarbeitet werden. {reasons}".strip()
            )
        _post(
            job["callbackUrl"],
            {
                "tenantId": tenant_id,
                "scanId": scan_id,
                "pages": processed_pages,
                "details": {
                    "recognizer": "mnist-onnx-digits+tesseract-fallback",
                    "documentPages": document_pages,
                    "processedPages": len(processed_pages),
                    "fieldCount": total_fields,
                    "pageErrors": page_errors,
                },
            },
        )
        LOGGER.info(
            "finished scan=%s pages=%d/%d fields=%d inked=%d recognized=%d page_errors=%d",
            scan_id,
            len(processed_pages),
            document_pages,
            total_fields,
            inked_count,
            recognized_count,
            len(page_errors),
        )
    except Exception as error:  # the backend persists a human-readable failure
        LOGGER.exception("scan failed scan=%s", scan_id)
        try:
            _post(
                job["callbackUrl"],
                {
                    "tenantId": tenant_id,
                    "scanId": scan_id,
                    "error": str(error),
                    "details": {"errorType": type(error).__name__},
                },
            )
        except Exception:
            LOGGER.exception("failure callback failed scan=%s", scan_id)


def main() -> None:
    client = redis.Redis.from_url(VALKEY_URL, decode_responses=True)
    while True:
        try:
            entry = client.brpop(QUEUE, timeout=20)
            if not entry:
                continue
            _, raw_job = entry
            process_job(json.loads(raw_job))
        except (redis.RedisError, requests.RequestException, json.JSONDecodeError, KeyError, ScanProcessingError):
            LOGGER.exception("worker loop error")
            time.sleep(3)


if __name__ == "__main__":
    main()
