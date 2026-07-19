import fs from "fs";
import path from "path";
// @ts-ignore - legacy build has no bundled types export path
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const EMBEDDINGS_DIR = path.join(process.cwd(), "data", "embeddings");
const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const EMBEDDINGS_URL = "https://models.github.ai/inference/embeddings";

export interface StoredChunk {
  id: string;
  text: string;
  embedding: number[];
}

// ---------- 1. Extract text from a PDF buffer (server-side, no canvas needed) ----------
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
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
    const pageText = content.items.map((item: any) => item.str).join(" ");
    fullText += pageText + "\n\n";
  }
  return fullText;
}

// ---------- 2. Chunk text (char-based, simple + good enough at this scale) ----------
export function chunkText(text: string, chunkSize = 800, overlap = 100): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  const chunks: string[] = [];
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
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const token = process.env.GITHUB_TOKEN || "";
  const res = await fetch(EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
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
    .sort((a: any, b: any) => a.index - b.index)
    .map((d: any) => d.embedding);
}

// ---------- 4. Cosine similarity ----------
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ---------- 5. Storage (flat JSON file per doc — matches existing db.json pattern) ----------
export function saveDocEmbeddings(docId: string, chunks: StoredChunk[]) {
  if (!fs.existsSync(EMBEDDINGS_DIR)) fs.mkdirSync(EMBEDDINGS_DIR, { recursive: true });
  const filePath = path.join(EMBEDDINGS_DIR, `${docId}.json`);
  fs.writeFileSync(
    filePath,
    JSON.stringify(
      { docId, chunks, model: EMBEDDING_MODEL, createdAt: new Date().toISOString() },
      null,
      2
    )
  );
}

export function loadDocEmbeddings(docId: string): StoredChunk[] | null {
  const filePath = path.join(EMBEDDINGS_DIR, `${docId}.json`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw).chunks;
}

// ---------- 6. Retrieval ----------
export function retrieveRelevantChunks(
  docId: string,
  queryEmbedding: number[],
  k = 4
): StoredChunk[] {
  const chunks = loadDocEmbeddings(docId);
  if (!chunks || chunks.length === 0) return [];
  const scored = chunks.map((c) => ({
    chunk: c,
    score: cosineSimilarity(c.embedding, queryEmbedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map((s) => s.chunk);
}
