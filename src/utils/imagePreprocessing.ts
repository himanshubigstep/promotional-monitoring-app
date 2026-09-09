// src/utils/imagePreprocessing.ts

type PreprocessOptions = {
  scale?: number; // upscale factor, e.g. 1.5–2 for small/low-res images
  contrast?: number; // 1 = no change, 1.4–1.6 works well for tags/labels
  grayscale?: boolean;
  maxWidth?: number; // safety cap so huge images don't blow up canvas/memory
};

const DEFAULT_OPTIONS: Required<PreprocessOptions> = {
  scale: 1.5,
  contrast: 1.4,
  grayscale: true,
  maxWidth: 2000,
};

/**
 * Loads a File into an <img>, draws it to a canvas with grayscale/contrast/
 * upscale filters applied, and returns a new File ready for Tesseract.
 */
export function preprocessImageForOCR(
  file: File,
  options: PreprocessOptions = {},
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Cap the scale so we don't upscale an already-large image into
      // something huge and slow. Only upscale small images meaningfully.
      let scale = opts.scale;
      const targetWidth = img.width * scale;
      if (targetWidth > opts.maxWidth) {
        scale = opts.maxWidth / img.width;
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context not available"));
        return;
      }

      // CSS filter string built from options
      const filters: string[] = [];
      if (opts.grayscale) filters.push("grayscale(1)");
      if (opts.contrast !== 1) filters.push(`contrast(${opts.contrast})`);
      ctx.filter = filters.join(" ") || "none";

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas toBlob failed"));
            return;
          }
          const processedFile = new File(
            [blob],
            file.name.replace(/\.\w+$/, "") + "-processed.png",
            { type: "image/png" },
          );
          resolve(processedFile);
        },
        "image/png",
        1,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for preprocessing"));
    };

    img.src = objectUrl;
  });
}
