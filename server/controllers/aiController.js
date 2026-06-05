
export const processAiAction = async (req, res) => {
  const { text, action } = req.body;

  if (!text || !action) {
    return res.status(400).json({ error: 'Text and action parameters are required' });
  }

  let systemPrompt = 'You are a helpful academic study assistant. Provide clear, structured, and concise information.';
  let userPrompt = '';

  switch (action.toLowerCase()) {
    case 'summarize':
      userPrompt = `Please provide a concise summary of the following text, capturing the core ideas in brief bullet points:\n\n"${text}"`;
      break;
    case 'explain':
      userPrompt = `Explain the following text in simple, easy-to-understand terms as if explaining to a beginner. Use a quick analogy if helpful:\n\n"${text}"`;
      break;
    case 'concepts':
      userPrompt = `Extract the key technical concepts, terms, or vocabulary from the following text. Format them as a clean list with brief definitions:\n\n"${text}"`;
      break;
    case 'flashcards':
      userPrompt = `Generate 3 high-yield study flashcards based on the following text. Format them clearly with "Question:" and "Answer:" blocks:\n\n"${text}"`;
      break;
    default:
      userPrompt = `Analyze the following text and explain its main message:\n\n"${text}"`;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const hasToken = process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN !== 'github_pat_placeholder';

  if (hasToken) {
    try {
      console.log(`🤖 Requesting GitHub Models API (gpt-4o-mini) for action: ${action}`);
      const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          model: 'gpt-4o-mini',
          stream: true,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('GitHub Models API error response:', errorText);
        throw new Error(`API responded with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        res.write(chunk);
      }

      res.end();
      return;
    } catch (err) {
      console.error('⚠️ GitHub Models API streaming failed. Falling back to simulation.', err.message);

    }
  } else {
    console.warn('⚠️ GITHUB_TOKEN is missing or placeholder. Running in simulation mode.');
  }

  const simulationResponses = {
    summarize: [
      "Here is a summary of the highlighted section:\n\n",
      "• **Core Subject:** The text discusses the fundamental structure of the topic.\n",
      "• **Key Insight:** Understanding this concept enables efficient system design and avoids common bottlenecks.\n",
      "• **Takeaway:** This forms the building block for all advanced modules in the curriculum."
    ],
    explain: [
      "Let's break this down into simple terms:\n\n",
      "Think of this concept like a **pantry in a restaurant**.\n",
      "Instead of the chef cooking ingredients directly from the farm (slow), they keep ingredients ready in the pantry (fast).\n\n",
      "Similarly, this module holds data ready in memory so the CPU doesn't have to fetch it from disk every time."
    ],
    concepts: [
      "Here are the key concepts extracted from the text:\n\n",
      "1. **Primary Component:** The central hub that coordinates all operations.\n",
      "2. **Latency:** The round-trip delay time for a request to be serviced.\n",
      "3. **Non-blocking I/O:** The ability to execute operations in the background without freezing the execution flow."
    ],
    flashcards: [
      "Here are 3 flashcards generated for revision:\n\n",
      "**Flashcard 1**\n",
      "Q: What is the main objective discussed in the passage?\n",
      "A: To reduce access times and optimize query performance.\n\n",
      "**Flashcard 2**\n",
      "Q: Why is non-blocking design preferred here?\n",
      "A: Because it prevents thread starvation and improves throughput.\n\n",
      "**Flashcard 3**\n",
      "Q: How is security maintained?\n",
      "A: By isolating file resources on a per-user token basis."
    ]
  };

  const lines = simulationResponses[action.toLowerCase()] || [
    "Analyzing the text... Here is the breakdown:\n",
    `Regarding: "${text.substring(0, 60)}..."\n`,
    "This represents a key architectural node that should be revised before production."
  ];

  for (const line of lines) {

    const sseChunk = `data: ${JSON.stringify({
      choices: [{ delta: { content: line } }]
    })}\n\n`;
    res.write(sseChunk);
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  res.write('data: [DONE]\n\n');
  res.end();
};