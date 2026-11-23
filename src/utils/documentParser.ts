import * as pdfjsLib from 'pdfjs-dist';

// Use standard CDN worker matching version 3.11.174 for 100% reliable cross-origin execution
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

/** Race a promise against a timeout. Rejects with Error('TIMEOUT') after ms. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`TIMEOUT after ${ms}ms`)), ms)
    )
  ]);
}

/** PDF internal structure syntax keywords to filter and reject */
const PDF_STRUCTURE_KEYWORDS = new Set([
  "cropbox", "mediabox", "xobject", "dctdecode", "flatedecode", "bitspercomponent",
  "colorspace", "devicergb", "devicegray", "jfif", "parent", "rotate", "objstm",
  "kids", "pages", "catalog", "filter", "length", "contents", "resources", "font",
  "encoding", "type0", "truetype", "fontdescriptor", "widths", "firstchar", "lastchar",
  "subtype", "basefont", "annots", "trailer", "startxref", "stream", "endstream", "endobj"
]);

/** Common English stopwords for natural language validation */
const ENGLISH_STOPWORDS = new Set([
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "it", "for", "not", "on", "with",
  "as", "you", "do", "at", "this", "but", "by", "from", "they", "we", "or", "an", "will",
  "my", "one", "all", "would", "there", "their", "what", "so", "up", "out", "if", "about",
  "who", "which", "me", "is", "are", "was", "were", "been", "has", "had", "can", "could",
  "should", "than", "more", "then", "its", "into", "also", "each", "other", "such"
]);

export interface ParsedDocumentResult {
  text: string;
  pageImages: string[];
  isScannedOrImage: boolean;
  pageCount: number;
}

/**
 * Main ingestion entry point: Parses PDF, Images (PNG/JPG), DOCX, or TXT.
 * Renders page images directly for Multimodal Vision LLMs, completely eliminating OCR noise.
 */
export async function parseDocument(
  file: File,
  onProgress?: (status: string) => void
): Promise<ParsedDocumentResult> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  // 1. Direct Image Files (PNG, JPG, JPEG, WEBP)
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) {
    if (onProgress) onProgress('Loading image for Multimodal Vision...');
    const dataUrl = await readImageFileAsDataUrl(file);
    return {
      text: `[Study Notes Image: ${file.name}]`,
      pageImages: [dataUrl],
      isScannedOrImage: true,
      pageCount: 1
    };
  }

  // 2. PDF Documents
  if (ext === 'pdf') {
    return await parsePDFDocument(file, onProgress);
  }

  // 3. Word Documents (DOCX)
  if (ext === 'docx') {
    const text = await extractTextFromDocx(file);
    return {
      text,
      pageImages: [],
      isScannedOrImage: false,
      pageCount: 1
    };
  }

  // 4. Plain Text / Markdown
  const text = await readTextFile(file);
  return {
    text,
    pageImages: [],
    isScannedOrImage: false,
    pageCount: 1
  };
}

/**
 * Backward compatibility wrapper returning plain string
 */
export async function parseFileToText(
  file: File,
  onProgress?: (status: string) => void
): Promise<string> {
  const res = await parseDocument(file, onProgress);
  return res.text;
}

/**
 * Renders PDF pages directly to JPEG Data URLs for Multimodal LLM ingestion
 * and attempts embedded text layer extraction if available.
 */
async function parsePDFDocument(
  file: File,
  onProgress?: (status: string) => void
): Promise<ParsedDocumentResult> {
  const rawArrayBuffer = await file.arrayBuffer();
  let pdf: pdfjsLib.PDFDocumentProxy | null = null;
  let pdfJsExtractedText = '';
  const pageImages: string[] = [];

  try {
    if (onProgress) onProgress('Initializing PDF processor...');
    const pdfBytes = new Uint8Array(rawArrayBuffer.slice(0));
    const loadingTask = pdfjsLib.getDocument({
      data: pdfBytes,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
      disableRange: true,
      disableStream: true,
      stopAtErrors: false,
    });

    pdf = await withTimeout(loadingTask.promise, 20000);
    const pageTexts: string[] = [];
    const maxPagesToProcess = Math.min(pdf.numPages, 8); // Render up to 8 pages for vision

    for (let pageNum = 1; pageNum <= maxPagesToProcess; pageNum++) {
      if (onProgress) {
        onProgress(`Rendering page ${pageNum} of ${maxPagesToProcess} for Multimodal Vision...`);
      }

      try {
        const page = await withTimeout(pdf.getPage(pageNum), 8000);

        // A. Attempt text extraction from text layer
        try {
          const textContent = await withTimeout(page.getTextContent(), 4000);
          const pageStr = textContent.items
            .map((item: any) => (typeof item.str === 'string' ? item.str : ''))
            .filter(s => s.trim().length > 0)
            .join(' ')
            .trim();
          if (pageStr.length > 0) pageTexts.push(pageStr);
        } catch (_tErr) {
          // No text layer on this page
        }

        // B. Render page directly to canvas -> Optimized study dimensions
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const targetWidth = 900;
        const scale = Math.min(1.2, targetWidth / Math.max(unscaledViewport.width, 1));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const canvasContext = canvas.getContext('2d');

        if (canvasContext) {
          await page.render({ canvasContext, viewport }).promise;
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          pageImages.push(dataUrl);
        }
      } catch (pageErr) {
        console.warn(`Error processing page ${pageNum} in "${file.name}":`, pageErr);
      }
    }

    pdfJsExtractedText = sanitizePDFText(pageTexts.join('\n\n'));

    // Check if the document has a readable embedded digital text layer
    const hasDigitalText = pdfJsExtractedText.length >= 40 && isReadableText(pdfJsExtractedText);

    if (hasDigitalText) {
      return {
        text: capText(pdfJsExtractedText),
        pageImages,
        isScannedOrImage: false,
        pageCount: pdf.numPages
      };
    } else {
      // Scanned or handwritten notes: pageImages are ready for Multimodal LLM
      const summaryText = `[Scanned Notes: ${file.name} (${pageImages.length} page(s) rendered for Multimodal AI generation)]`;
      return {
        text: summaryText,
        pageImages,
        isScannedOrImage: true,
        pageCount: pdf.numPages
      };
    }
  } catch (err: any) {
    console.error(`PDF processing error for "${file.name}":`, err);
    throw new Error(
      `Could not read "${file.name}". Please ensure it is a valid PDF document or image file.`
    );
  }
}

function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || '');
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

async function extractTextFromDocx(file: File): Promise<string> {
  try {
    const text = await file.text();
    const matches = text.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
    if (matches && matches.length > 0) {
      return matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
    }
  } catch (err) {
    console.warn('DOCX parsing notice:', err);
  }
  return await readTextFile(file);
}

function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || '');
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

function sanitizePDFText(text: string): string {
  return text
    .replace(/%PDF-[\d.]+/gi, '')
    .replace(/xref[\s\S]*?trailer/gi, '')
    .replace(/\b\d{8,}\b/g, '')
    .replace(/\b(0000000000|65535)\b/g, '')
    .replace(/\b(Root|Info|Size|xref|trailer|startxref)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Rigorous real-language sanity check for extracted PDF text.
 */
function isReadableText(text: string): boolean {
  if (!text || text.length < 40) return false;

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);

  if (words.length < 5) return false;

  // 1. PDF structure keyword density check (< 15%)
  let pdfKeywordCount = 0;
  for (const w of words) {
    if (PDF_STRUCTURE_KEYWORDS.has(w)) {
      pdfKeywordCount++;
    }
  }
  const pdfKeywordRatio = pdfKeywordCount / words.length;
  if (pdfKeywordRatio >= 0.15) {
    return false;
  }

  // 2. English stopword density check (>= 2%)
  let stopwordCount = 0;
  for (const w of words) {
    if (ENGLISH_STOPWORDS.has(w)) {
      stopwordCount++;
    }
  }
  const stopwordRatio = stopwordCount / words.length;
  if (stopwordRatio < 0.02) {
    return false;
  }

  // 3. Letter vs total character ratio check (>= 40%)
  const cleanNoSpace = text.replace(/\s+/g, '');
  if (cleanNoSpace.length === 0) return false;
  const lettersOnly = text.replace(/[^a-zA-Z]/g, '');
  const letterRatio = lettersOnly.length / cleanNoSpace.length;
  if (letterRatio < 0.40) {
    return false;
  }

  return true;
}

/**
 * Truncates text to a max character count to prevent UI freezes.
 */
function capText(text: string, maxChars: number = 80000): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n\n[Content truncated for performance...]';
}

/**
 * Creates a high-resolution sample study notes page image (Correlation & Regression)
 * drawn to an offscreen canvas as a JPEG data URL.
 */
export function createSampleStudyNotesImage(): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1500;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background - vintage ruled study paper
  ctx.fillStyle = '#fffdf7';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Red margin line
  ctx.strokeStyle = '#f87171';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(120, 0);
  ctx.lineTo(120, canvas.height);
  ctx.stroke();

  // Ruled horizontal lines
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (let y = 140; y < canvas.height; y += 45) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Handwritten note title
  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
  ctx.fillText('Unit III: Correlation & Linear Regression Analysis', 150, 95);

  const lines = [
    '1. Correlation Definition & Core Concept:',
    '   Correlation is a statistical measure expressing the extent to which two variables',
    '   are linearly related. It indicates both the direction and strength of relationship.',
    '',
    '2. Karl Pearson\'s Coefficient of Correlation (r):',
    '   Formula:  r = Cov(X, Y) / (sigma_x * sigma_y)',
    '   Computational:  r = [ n*sum(XY) - sum(X)*sum(Y) ] / sqrt([n*sum(X^2)-(sum(X))^2] * [n*sum(Y^2)-(sum(Y))^2])',
    '   Properties:',
    '   - Range: -1.0 <= r <= +1.0',
    '   - r = +1 denotes Perfect Positive Linear Correlation',
    '   - r = -1 denotes Perfect Negative Linear Correlation',
    '   - r = 0 indicates Absence of Linear Correlation',
    '   - r is independent of change of origin and scale',
    '',
    '3. Spearman\'s Rank Correlation (rho):',
    '   Formula for non-repeated ranks: rho = 1 - (6 * sum(d^2)) / [n * (n^2 - 1)]',
    '   Used when variables cannot be measured numerically but can be ranked (e.g. beauty, intelligence).',
    '',
    '4. Linear Regression Analysis:',
    '   Regression determines the mathematical functional relation between variables to predict dependent Y.',
    '   - Regression equation of Y on X:  (Y - Y_bar) = b_yx * (X - X_bar)',
    '     where regression coefficient b_yx = r * (sigma_y / sigma_x)',
    '   - Regression equation of X on Y:  (X - X_bar) = b_xy * (Y - Y_bar)',
    '     where regression coefficient b_xy = r * (sigma_x / sigma_y)',
    '',
    '5. Crucial Properties of Regression Coefficients:',
    '   - Pearson r is the geometric mean of coefficients:  r = +/- sqrt(b_yx * b_xy)',
    '   - Both b_yx and b_xy must have the same sign (either both positive or both negative).',
    '   - If one regression coefficient is > 1, the other coefficient MUST be < 1.'
  ];

  let currentY = 175;
  for (const line of lines) {
    if (line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.') || line.startsWith('4.') || line.startsWith('5.')) {
      ctx.fillStyle = '#0f766e';
      ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
    } else if (line.includes('Formula:')) {
      ctx.fillStyle = '#7c2d12';
      ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.font = '20px "Segoe UI", Arial, sans-serif';
    }
    ctx.fillText(line, 150, currentY);
    currentY += 45;
  }

  return canvas.toDataURL('image/jpeg', 0.9);
}

