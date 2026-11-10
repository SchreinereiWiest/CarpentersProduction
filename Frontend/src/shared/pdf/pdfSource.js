export function pdfSourceUsesCredentials(sourceUrl, currentOrigin = globalThis.location?.origin || "http://localhost") {
  if (!sourceUrl || String(sourceUrl).startsWith("blob:") || String(sourceUrl).startsWith("data:")) return false;
  try {
    return new URL(sourceUrl, currentOrigin).origin === currentOrigin;
  } catch {
    return false;
  }
}
