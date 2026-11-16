const IMAGE_FILE_EXTENSION = /\.(?:avif|bmp|gif|heic|heif|jpe?g|png|webp)$/i;

export const isProjectImageFile = (file) => {
  if (String(file?.mimeType ?? "").toLowerCase().startsWith("image/")) {
    return true;
  }
  const fileName = file?.fileName ?? file?.originalName ?? file?.name ?? "";
  return IMAGE_FILE_EXTENSION.test(String(fileName));
};

