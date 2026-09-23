import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { RasterPixelSource } from '../domain/referenceDetection';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type ReferenceFileKind = 'image' | 'pdf';

export interface RenderedReferenceFile {
  url: string;
  widthPx: number;
  heightPx: number;
  raster: RasterPixelSource;
  kind: ReferenceFileKind;
  pageNumber: number;
  pageCount: number;
  sourceName: string;
}

export function referenceFileKind(file: Pick<File, 'name' | 'type'>): ReferenceFileKind | undefined {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return 'pdf';
  if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name)) return 'image';
  return undefined;
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Conversion du plan en image impossible.')), 'image/png');
  });
}

async function renderImage(file: File): Promise<RenderedReferenceFile> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Ce fichier image ne peut pas être chargé.'));
      image.src = objectUrl;
    });

    const maxDimension = 2200;
    const factor = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const widthPx = Math.max(1, Math.round(image.naturalWidth * factor));
    const heightPx = Math.max(1, Math.round(image.naturalHeight * factor));
    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas image indisponible.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, widthPx, heightPx);
    context.drawImage(image, 0, 0, widthPx, heightPx);
    const blob = await canvasBlob(canvas);
    return {
      url: URL.createObjectURL(blob),
      widthPx,
      heightPx,
      raster: { widthPx, heightPx, data: context.getImageData(0, 0, widthPx, heightPx).data },
      kind: 'image',
      pageNumber: 1,
      pageCount: 1,
      sourceName: file.name,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function renderPdf(file: File, requestedPage: number): Promise<RenderedReferenceFile> {
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  const pageNumber = Math.min(pdf.numPages, Math.max(1, Math.round(requestedPage || 1)));
  const page = await pdf.getPage(pageNumber);
  const rawViewport = page.getViewport({ scale: 1 });
  const maxDimension = 2200;
  const scale = Math.min(3, Math.max(1, maxDimension / Math.max(rawViewport.width, rawViewport.height)));
  const viewport = page.getViewport({ scale });
  const widthPx = Math.max(1, Math.floor(viewport.width));
  const heightPx = Math.max(1, Math.floor(viewport.height));
  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas PDF indisponible.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, widthPx, heightPx);
  await page.render({ canvasContext: context, viewport }).promise;
  const blob = await canvasBlob(canvas);

  return {
    url: URL.createObjectURL(blob),
    widthPx,
    heightPx,
    raster: { widthPx, heightPx, data: context.getImageData(0, 0, widthPx, heightPx).data },
    kind: 'pdf',
    pageNumber,
    pageCount: pdf.numPages,
    sourceName: file.name,
  };
}

export async function renderReferenceFile(file: File, pageNumber = 1): Promise<RenderedReferenceFile> {
  const kind = referenceFileKind(file);
  if (!kind) throw new Error('Format non pris en charge. Utilisez JPG, PNG ou PDF.');
  return kind === 'pdf' ? renderPdf(file, pageNumber) : renderImage(file);
}
