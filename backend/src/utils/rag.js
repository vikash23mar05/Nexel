// backend/src/utils/rag.js
const fs = require('fs');
const path = require('path');
const Embedding = require('../models/Embedding');

const EMBEDDING_MODEL = 'openai/text-embedding-3-small';
const EMBEDDINGS_URL = 'https://models.github.ai/inference/embeddings';

// 1. Extract text from PDF buffer
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

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(' ');
    fullText += pageText + '\n\n';
  }
  return fullText;
}

// 2. Chunk text
function chunkText(text, chunkSize = 800, overlap = 100) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
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

// Helper: Local fallback vectorizer (384-dimensional hash vector for zero-dependency RAG)
function generateLocalVector(text, dimensions = 384) {
  const vec = new Array(dimensions).fill(0);
  const words = text.toLowerCase().match(/\b[a-z0-9]+\b/g) || [];
  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dimensions;
    vec[idx] += 1;
  }
  // Normalize vector
  const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  return norm > 0 ? vec.map((v) => v / norm) : vec;
}

// 3. Embed texts via API with automatic local fallback
async function embedTexts(texts) {
  if (!texts || texts.length === 0) return [];
  
  const openaiKey = process.env.OPENAI_API_KEY;
  const token = process.env.GITHUB_TOKEN || '';

  if (openaiKey && openaiKey.startsWith('sk-')) {
    try {
      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({ model: 'text-embedding-3-small', input: texts }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
      }
    } catch (e) {}
  }

  if (token) {
    try {
      const res = await fetch(EMBEDDINGS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
      });

      if (res.ok) {
        const data = await res.json();
        return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
      }
    } catch (e) {}
  }

  // Zero-dependency local fallback vectorization (always works offline)
  return texts.map((t) => generateLocalVector(t));
}

// 4. Cosine Similarity
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 5. Save document embeddings to MongoDB
async function processAndSaveDocumentRAG(documentId, filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const fullText = await extractTextFromPdf(fileBuffer);
    const chunks = chunkText(fullText);

    if (chunks.length === 0) return;

    const embeddings = await embedTexts(chunks);

    // Delete existing embeddings for this document if any
    await Embedding.deleteMany({ document: documentId });

    // Save to MongoDB
    const embeddingDocs = chunks.map((text, idx) => ({
      document: documentId,
      chunkIndex: idx,
      text,
      embedding: embeddings[idx],
    }));

    await Embedding.insertMany(embeddingDocs);
    console.log(`[RAG] Successfully stored ${embeddingDocs.length} chunks in MongoDB for document ${documentId}`);
  } catch (err) {
    console.error(`[RAG Error] Failed to process document RAG for ${documentId}:`, err);
  }
}

// 6. Retrieve top-k relevant chunks from MongoDB
async function retrieveRelevantChunksFromMongo(documentId, queryText, k = 4) {
  try {
    if (!queryText) return [];
    const [queryEmbedding] = await embedTexts([queryText]);
    if (!queryEmbedding) return [];

    const storedEmbeddings = await Embedding.find({ document: documentId });
    if (!storedEmbeddings || storedEmbeddings.length === 0) return [];

    const scored = storedEmbeddings.map((doc) => ({
      text: doc.text,
      score: cosineSimilarity(doc.embedding, queryEmbedding),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
  } catch (err) {
    console.error(`[RAG Error] Failed to retrieve chunks for document ${documentId}:`, err);
    return [];
  }
}

module.exports = {
  extractTextFromPdf,
  chunkText,
  embedTexts,
  cosineSimilarity,
  processAndSaveDocumentRAG,
  retrieveRelevantChunksFromMongo,
};
