// backend/src/utils/rag.js
const fs = require('fs');
const path = require('path');

/**
 * Extracts text from a PDF buffer using pdfjs-dist.
 * Uses dynamic import since pdfjs-dist is an ES module.
 */
async function extractTextFromPdf(buffer) {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
  });
  const pdf = await loadingTask.promise;

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n\n";
  }
  return fullText;
}

/**
 * Simple character-based text chunking with overlap.
 */
function chunkText(text, chunkSize = 800, overlap = 100) {
  const clean = text.replace(/\s+/g, " ").trim();
  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + chunkSize, clean.length);
    chunks.push(clean.slice(start, end));
    if (end === clean.length) break;
    start = end - overlap;
  }
  return chunks;
}

/**
 * Generates embeddings using the GitHub Models Inference API.
 */
async function embedTexts(texts) {
  const token = process.env.GITHUB_TOKEN || "";
  if (!token) {
    throw new Error("No GITHUB_TOKEN configured in environment");
  }

  const res = await fetch("https://models.github.ai/inference/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ model: "openai/text-embedding-3-small", input: texts }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Embedding request failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return data.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/**
 * Saves generated embeddings to data/embeddings/<docId>.json.
 */
function saveDocEmbeddings(docId, chunks) {
  // Use project root path for data folder (two levels up from backend/src/utils)
  const EMBEDDINGS_DIR = path.join(__dirname, '..', '..', '..', 'data', 'embeddings');
  if (!fs.existsSync(EMBEDDINGS_DIR)) fs.mkdirSync(EMBEDDINGS_DIR, { recursive: true });
  const filePath = path.join(EMBEDDINGS_DIR, `${docId}.json`);
  fs.writeFileSync(
    filePath,
    JSON.stringify(
      { docId, chunks, model: "openai/text-embedding-3-small", createdAt: new Date().toISOString() },
      null,
      2
    )
  );
}

module.exports = {
  extractTextFromPdf,
  chunkText,
  embedTexts,
  saveDocEmbeddings
};
