# Measurement OCR

Isolierter Worker für handschriftlich ausgefüllte Aufmaßblätter. Er liest Jobs
aus Valkey, verarbeitet PDF-Seiten nacheinander, richtet jede PDF-/Bildseite mit
OpenCV perspektivisch aus, erkennt den QR-Identifier, schneidet die beim
PDF-Druck gespeicherten Felder in physischen Seitenkoordinaten aus und erkennt
darin Ziffern mit einem lokal ausgeführten ONNX-MNIST-Modell. Tesseract bleibt
als Fallback aktiv.

Der Worker hat keinen Datenbankzugriff. Drucklayout und Ergebnis werden über
mit `MEASUREMENT_OCR_SECRET` geschützte interne Backend-Endpunkte aufgelöst bzw.
zurückgemeldet. Damit bleiben Mandantenzuordnung und fachliche Freigabe im
Backend.

Produktive Scans sollten mit 200–300 dpi, vollständig sichtbaren Seitenrändern
und ohne starke Schatten hochgeladen werden. Die erkannten Werte werden nie
automatisch übernommen, sondern landen zuerst in der Aufmaß-Kontrollansicht.
Mehrseitige PDFs dürfen bis zu `MEASUREMENT_OCR_MAX_PAGES` Seiten enthalten
(Standard: 50) und müssen einem gemeinsamen Projekt zugeordnet sein. Fehlerhafte
Einzelseiten werden als Warnung ausgewiesen; erfolgreich gelesene Seiten bleiben
prüfbar.

Das kompakte MNIST-Modell stammt aus Microsofts MIT-lizenziertem
`onnxruntime-inference-examples`-Repository. Der Download ist im Dockerfile auf
einen Commit und eine SHA-256-Prüfsumme festgelegt.
