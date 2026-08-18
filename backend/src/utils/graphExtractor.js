// backend/src/utils/graphExtractor.js
const fs = require('fs');
const KnowledgeGraph = require('../models/KnowledgeGraph');
const Embedding = require('../models/Embedding');
const { extractTextFromPdf } = require('./rag');

// Heuristic fallback concept extractor (works 100% offline without API key)
function extractHeuristicGraph(text, documentId) {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const sentences = cleanText.split(/(?<=[.!?])\s+/).filter((s) => s.length > 15);

  // Extract key phrases and capitalized terms from actual text
  const titleMatches = cleanText.match(/\b[A-Z][a-zA-Z0-9\s]{2,30}\b/g) || [];
  const freqMap = {};
  for (const match of titleMatches) {
    const term = match.trim();
    if (term.length > 3 && !['This', 'That', 'With', 'From', 'Have', 'They', 'What', 'When', 'Where', 'Sample'].includes(term)) {
      freqMap[term] = (freqMap[term] || 0) + 1;
    }
  }

  const sortedTerms = Object.keys(freqMap)
    .sort((a, b) => freqMap[b] - freqMap[a])
    .slice(0, 10);

  const defaultTerms = sortedTerms.length > 0 ? sortedTerms : ['Document Overview', 'Main Topic', 'Key Terms'];

  const categories = ['Concept', 'Definition', 'Formula', 'Process', 'Term'];

  const nodes = defaultTerms.map((term, index) => {
    const relatedSentence = sentences.find((s) => s.toLowerCase().includes(term.toLowerCase())) || `${term} in document`;
    return {
      id: `node_${index + 1}`,
      label: term,
      category: categories[index % categories.length],
      description: relatedSentence.slice(0, 150),
    };
  });

  const edges = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      id: `edge_${i + 1}`,
      source: nodes[i].id,
      target: nodes[i + 1].id,
      label: i % 2 === 0 ? 'relates to' : 'leads to',
    });
  }

  if (nodes.length > 2) {
    edges.push({
      id: `edge_cross_1`,
      source: nodes[0].id,
      target: nodes[nodes.length - 1].id,
      label: 'connects with',
    });
  }

  return {
    document: documentId,
    nodes,
    edges,
    summary: `Extracted ${nodes.length} key concepts and ${edges.length} relationships from document.`,
  };
}

// AI-based Knowledge Graph extraction
async function extractKnowledgeGraph(documentId, filePath) {
  try {
    let fullText = '';
    
    // 1. Try reading PDF from disk
    if (filePath && fs.existsSync(filePath)) {
      try {
        const fileBuffer = fs.readFileSync(filePath);
        fullText = await extractTextFromPdf(fileBuffer);
      } catch (err) {
        console.warn(`[GraphExtractor] Could not parse PDF file at ${filePath}:`, err.message);
      }
    }

    // 2. If PDF read failed or file missing, pull document text from MongoDB Embeddings!
    if (!fullText || fullText.trim().length < 20) {
      const storedChunks = await Embedding.find({ document: documentId }).limit(15);
      if (storedChunks && storedChunks.length > 0) {
        fullText = storedChunks.map((c) => c.text).join('\n\n');
        console.log(`[GraphExtractor] Loaded ${storedChunks.length} chunks from MongoDB for document ${documentId}`);
      }
    }

    if (!fullText || fullText.trim().length < 20) {
      fullText = 'Document Content Overview';
    }

    const sampleText = fullText.slice(0, 4000);

    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    let url = '';
    let apiKey = '';
    let modelName = '';
    let headers = { 'Content-Type': 'application/json' };

    if (groqKey) {
      url = 'https://api.groq.com/openai/v1/chat/completions';
      apiKey = groqKey;
      modelName = 'openai/gpt-oss-20b';
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (geminiKey) {
      url = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
      apiKey = geminiKey;
      modelName = 'gemini-1.5-flash';
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (openrouterKey) {
      url = 'https://openrouter.ai/api/v1/chat/completions';
      apiKey = openrouterKey;
      modelName = 'meta-llama/llama-3.3-70b-instruct:free';
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (openaiKey) {
      url = 'https://api.openai.com/v1/chat/completions';
      apiKey = openaiKey;
      modelName = 'gpt-4o-mini';
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    if (!url || !apiKey) {
      console.log('[GraphExtractor] No AI API key found, using heuristic concept extraction.');
      const graphData = extractHeuristicGraph(fullText, documentId);
      return await KnowledgeGraph.findOneAndUpdate({ document: documentId }, graphData, { upsert: true, new: true });
    }

    const systemPrompt = `You are a Knowledge Graph extraction assistant. Extract key concepts (nodes) and their relationships (edges) from the document text. Return ONLY a valid JSON object with the following structure:
{
  "nodes": [
    { "id": "1", "label": "Concept Name", "category": "Concept", "description": "Brief description" }
  ],
  "edges": [
    { "id": "e1", "source": "1", "target": "2", "label": "relates to" }
  ],
  "summary": "High-level summary of the document concepts."
}
categories MUST be one of: "Concept", "Definition", "Formula", "Process", "Term".`;

    const userPrompt = `Extract knowledge graph from document text:\n\n${sampleText}`;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        model: modelName,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      console.warn(`[GraphExtractor] AI API returned ${res.status}, using text heuristic extractor.`);
      const graphData = extractHeuristicGraph(fullText, documentId);
      return await KnowledgeGraph.findOneAndUpdate({ document: documentId }, graphData, { upsert: true, new: true });
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    // Extract JSON block from response
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[GraphExtractor] Could not parse JSON from AI response, using text heuristic extractor.');
      const graphData = extractHeuristicGraph(fullText, documentId);
      return await KnowledgeGraph.findOneAndUpdate({ document: documentId }, graphData, { upsert: true, new: true });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const graphData = {
      document: documentId,
      nodes: parsed.nodes || [],
      edges: parsed.edges || [],
      summary: parsed.summary || 'Knowledge Graph extracted automatically.',
    };

    return await KnowledgeGraph.findOneAndUpdate({ document: documentId }, graphData, { upsert: true, new: true });
  } catch (err) {
    console.error('[GraphExtractor Error]', err);
    const graphData = extractHeuristicGraph('Document Content Overview', documentId);
    return await KnowledgeGraph.findOneAndUpdate({ document: documentId }, graphData, { upsert: true, new: true });
  }
}

module.exports = {
  extractKnowledgeGraph,
  extractHeuristicGraph,
};
