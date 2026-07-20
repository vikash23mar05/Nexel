// src/routes/ai.js
// AI generation on Express (Plan B consolidation). Ports app/api/ai/generate/route.ts.
// RAG retrieval uses lib/rag.js (Mongo-backed embeddings). Behind auth.
// Streams plain-text chunks so the frontend reader loop is unchanged.
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { embedTexts, retrieveRelevantChunks } = require('../lib/rag');
const logger = require('../utils/logger');

router.use(auth);

const CHAT_URL = 'https://models.inference.ai.azure.com/chat/completions';

function systemPromptFor(action, hasRagContext) {
  switch (action) {
    case 'summarize':
      return 'You are a helpful assistant. Summarize the provided text concisely.';
    case 'explain':
      return 'You are a helpful assistant. Explain the provided text in simpler terms.';
    case 'flashcards':
      return 'You are a helpful assistant. Generate a few flashcards based on the provided text. Format them as Q: ... A: ...';
    case 'chat':
      return hasRagContext
        ? "You are a helpful assistant answering questions about a document. Use the provided excerpts to answer accurately. If the excerpts don't contain the answer, say so clearly instead of guessing."
        : 'You are a helpful assistant.';
    default:
      return 'You are a helpful assistant.';
  }
}

// Stream a fixed message as plain text and end (used for config/API errors so the
// frontend still renders something in the chat bubble).
function streamMessage(res, msg) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.write(msg);
  res.end();
}

router.post('/generate', async (req, res) => {
  try {
    const { prompt, action, text, docId } = req.body;

    // ---------- RAG retrieval ----------
    let ragContext = '';
    if (docId) {
      try {
        const queryText = prompt || text || '';
        if (queryText) {
          const [queryEmbedding] = await embedTexts([queryText]);
          const relevantChunks = await retrieveRelevantChunks(docId, queryEmbedding, 4);
          if (relevantChunks.length > 0) {
            ragContext = relevantChunks
              .map((c, i) => `[Excerpt ${i + 1}]\n${c.text}`)
              .join('\n\n');
            logger.info(`[RAG] Retrieved ${relevantChunks.length} chunks for docId: ${docId}`);
          }
        }
      } catch (err) {
        logger.error(`RAG retrieval failed, falling back to no context: ${err.message}`);
      }
    }

    const systemPrompt = systemPromptFor(action, Boolean(ragContext));

    // Hybrid context: retrieved chunks + the exact highlighted selection.
    const combinedContext = [ragContext, text].filter(Boolean).join('\n\n---\n\n');
    const finalPrompt = prompt
      ? `${prompt}\n\nContext text: ${combinedContext}`
      : `Text to process: ${combinedContext}`;

    const token = process.env.GITHUB_TOKEN || '';
    if (!token) {
      return streamMessage(
        res,
        '⚠️ **Configuration Error**\n\nNo GITHUB_TOKEN detected on the server. Please add it to start using free AI features.'
      );
    }

    const response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: finalPrompt },
        ],
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      let errorText = 'Unknown error';
      try {
        const errorData = await response.json();
        errorText = errorData.message || JSON.stringify(errorData);
      } catch (e) {
        errorText = await response.text();
      }
      return streamMessage(res, `⚠️ **GitHub Models API Error (${response.status})**\n\n${errorText}`);
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content || 'No response generated.';

    // Simulated streaming (matches previous UX): 10-char chunks with a small delay.
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    const chunks = generatedText.match(/.{1,10}/g) || [];
    for (const chunk of chunks) {
      res.write(chunk);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    res.end();
  } catch (error) {
    logger.error(`Error generating AI response: ${error.message}`);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.end();
    }
  }
});

module.exports = router;
