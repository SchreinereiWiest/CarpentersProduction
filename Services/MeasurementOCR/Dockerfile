FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TESSDATA_PREFIX=/usr/share/tesseract-ocr/5/tessdata

RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-eng libglib2.0-0 libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /service
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

ARG MNIST_MODEL_URL=https://huggingface.co/onnxmodelzoo/mnist-8/resolve/a19f9a8c2333de1df9b03f10f5739f468b699a1a/mnist-8.onnx
ARG MNIST_MODEL_SHA256=2f06e72de813a8635c9bc0397ac447a601bdbfa7df4bebc278723b958831c9bf
RUN mkdir -p /service/models \
    && python -c "import hashlib, pathlib, urllib.request; data = urllib.request.urlopen('${MNIST_MODEL_URL}', timeout=60).read(); actual = hashlib.sha256(data).hexdigest(); assert actual == '${MNIST_MODEL_SHA256}', f'MNIST model checksum mismatch: {actual}'; pathlib.Path('/service/models/mnist.onnx').write_bytes(data)"

COPY measurement_ocr ./measurement_ocr

USER 65534:65534
CMD ["python", "-m", "measurement_ocr.worker"]
