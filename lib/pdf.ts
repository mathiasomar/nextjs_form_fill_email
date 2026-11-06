import { PDFDocument } from "pdf-lib";

/** Combines the front and back of the National ID onto one A4 page. Returns null if an image type is unsupported (e.g. webp/heic). */
export async function buildIdPdf(images: { bytes: Buffer; type: string }[]): Promise<Buffer | null> {
  try {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    const slotH = 340;
    for (let i = 0; i < images.length; i++) {
      const { bytes, type } = images[i];
      const img = type === "image/png" ? await pdf.embedPng(bytes) : type === "image/jpeg" ? await pdf.embedJpg(bytes) : null;
      if (!img) return null;
      const s = Math.min(495 / img.width, 320 / img.height);
      const w = img.width * s;
      const h = img.height * s;
      const top = 842 - 50 - i * slotH;
      page.drawImage(img, { x: (595 - w) / 2, y: top - h - (slotH - h) / 2, width: w, height: h });
    }
    return Buffer.from(await pdf.save());
  } catch {
    return null;
  }
}
