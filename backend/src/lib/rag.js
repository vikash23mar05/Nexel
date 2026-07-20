// backend/src/lib/rag.js
// CommonJS RAG helper for the Express backend (Plan B consolidation).
// Ports the logic previously in src/lib/rag.ts so RAG lives entirely on Express.
// Embeddings are persisted in MongoDB via the Embedding model (see models/Embedding.js),
// which is durable across Render restarts unlike local disk.

const Embedding = require('../models/Embedding');
const logger = require('../utils/logger');

const EMBEDDING_MODEL = 'openai/text-embedding-3-small';
const EMBEDDINGS_URL = 'https://models.github.ai/inference/embeddings';

// ---------- 1. Extract text from a PDF buffer (server-side, no canvas) ----------
async function extractTextFromPdf(buffer) {
  // pdfjs-dist legacy build is ESM; load it via dynamic import from CJS.
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
  });
  const pdf = await loadingTask.promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(' ');
    fullText += pageText + '\n\n';
  }
  return fullText;
}

// ---------- 2. Chunk text (char-based, simple + good enough at this scale) ----------
function chunkText(text, chunkSize = 800, overlap = 100) {
  const clean = text.replace(/\s+/g, ' ').trim();
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

// ---------- 3. Embed texts via GitHub Models ----------
async function embedTexts(texts) {
  const token = process.env.GITHUB_TOKEN || '';
  const res = await fetch(EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
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

// ---------- 4. Cosine similarity ----------
function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ---------- 5. Storage (MongoDB, keyed by document id) ----------
async function saveDocEmbeddings(docId, chunks) {
  await Embedding.findOneAndUpdate(
    { docId },
    { docId, chunks, model: EMBEDDING_MODEL },
    { upsert: true, new: true }
  );
}

async function loadDocEmbeddings(docId) {
  const record = await Embedding.findOne({ docId }).lean();
  return record ? record.chunks : null;
}

// ---------- 6. Retrieval ----------
async function retrieveRelevantChunks(docId, queryEmbedding, k = 4) {
  const chunks = await loadDocEmbeddings(docId);
  if (!chunks || chunks.length === 0) return [];
  const scored = chunks.map((c) => ({
    chunk: c,
    score: cosineSimilarity(c.embedding, queryEmbedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map((s) => s.chunk);
}

// ---------- 7. Convenience: index a PDF buffer end-to-end ----------
async function indexPdfBuffer(docId, buffer) {
  try {
    const text = await extractTextFromPdf(buffer);
    if (text.trim().length === 0) return 0;
    const chunkTexts = chunkText(text);
    const embeddings = await embedTexts(chunkTexts);
    const chunks = chunkTexts.map((t, i) => ({
      id: `${docId}-${i}`,
      text: t,
      embedding: embeddings[i],
    }));
    await saveDocEmbeddings(docId, chunks);
    logger.info(`[RAG] Embedded ${chunks.length} chunks for doc: ${docId}`);
    return chunks.length;
  } catch (err) {
    logger.error(`[RAG] Embedding generation failed for doc ${docId}: ${err.message}`);
    return 0;
  }
}

module.exports = {
  EMBEDDING_MODEL,
  extractTextFromPdf,
  chunkText,
  embedTexts,
  cosineSimilarity,
  saveDocEmbeddings,
  loadDocEmbeddings,
  retrieveRelevantChunks,
  indexPdfBuffer,
};
