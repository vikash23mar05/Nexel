// backend/src/routes/ai.js
const express = require('express');
const router = express.Router();
const { retrieveRelevantChunksFromMongo } = require('../utils/rag');

router.post('/generate', async (req, res, next) => {
  try {
    const { prompt, action, text, docId } = req.body;

    let ragContext = '';
    if (docId) {
      try {
        const queryText = prompt || text || '';
        if (queryText) {
          const relevantChunks = await retrieveRelevantChunksFromMongo(docId, queryText, 4);
          if (relevantChunks.length > 0) {
            ragContext = relevantChunks
              .map((c, i) => `[Excerpt ${i + 1}]\n${c.text}`)
              .join('\n\n');
            console.log(`[Express RAG] Retrieved ${relevantChunks.length} chunks for docId: ${docId}`);
          }
        }
      } catch (err) {
        console.error('RAG retrieval failed, falling back to no context:', err);
      }
    }

    let systemPrompt = '';
    if (action === 'summarize') {
      systemPrompt = 'You are a helpful assistant. Summarize the provided text concisely.';
    } else if (action === 'explain') {
      systemPrompt = 'You are a helpful assistant. Explain the provided text in simpler terms.';
    } else if (action === 'flashcards') {
      systemPrompt = 'You are a helpful assistant. Generate a few flashcards based on the provided text. Format them as Q: ... A: ...';
    } else if (action === 'chat') {
      systemPrompt = ragContext
        ? 'You are a helpful assistant answering questions about a document. Use the provided excerpts to answer accurately. If the excerpts don\'t contain the answer, say so clearly instead of guessing.'
        : 'You are a helpful assistant.';
    } else {
      systemPrompt = 'You are a helpful assistant.';
    }

    const combinedContext = [ragContext, text].filter(Boolean).join('\n\n---\n\n');
    const finalPrompt = prompt
      ? `${prompt}\n\nContext text: ${combinedContext}`
      : `Text to process: ${combinedContext}`;

    // Environment key priority: GROQ_API_KEY > GEMINI_API_KEY > OPENROUTER_API_KEY > OPENAI_API_KEY > GITHUB_TOKEN
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const githubToken = process.env.GITHUB_TOKEN;

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
    } else if (githubToken) {
      url = 'https://models.github.ai/inference/chat/completions';
      apiKey = githubToken;
      modelName = 'gpt-4o-mini';
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send('⚠️ **API Key Missing**\n\nPlease add GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, or OPENAI_API_KEY to your .env file.');
    }

    const payload = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: finalPrompt }
      ],
      model: modelName,
      temperature: 0.7,
      max_tokens: 1024
    };

    let generatedText = '';
    try {
      const aiRes = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (aiRes.ok) {
        const data = await aiRes.json();
        generatedText = data.choices?.[0]?.message?.content || 'No response generated.';
      } else {
        const rawText = await aiRes.text();
        console.warn(`[AI Provider Warning ${aiRes.status}]`, rawText);
        generatedText = `[AI System Notification]\n\nDocument processed successfully!\n\nNote: API Provider (${url}) returned HTTP ${aiRes.status}. Check your API key in .env.`;
      }
    } catch (fetchErr) {
      console.error('[AI API Error]', fetchErr);
      generatedText = `[AI Connection Error]\n\nFailed to reach AI provider: ${fetchErr.message}`;
    }

    // Stream text back chunked
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const chunks = generatedText.match(/.{1,10}/g) || [generatedText];
    for (const chunk of chunks) {
      res.write(chunk);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    res.end();
  } catch (error) {
    console.error('Error generating AI response:', error);
    next(error);
  }
});

module.exports = router;
