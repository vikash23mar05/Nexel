import { NextResponse } from "next/server";

// Global Unhandled Rejection Shield to prevent Next.js dev server from crashing on async errors
if (typeof process !== "undefined") {
  process.on("unhandledRejection", (reason) => {
    console.warn("⚠️ [Unhandled Rejection Shielded]:", reason);
  });
}

export async function POST(req: Request) {
  try {
    const { prompt, action, text } = await req.json();

    let systemPrompt = "";
    if (action === "summarize") {
      systemPrompt = "You are a helpful assistant. Summarize the provided text concisely.";
    } else if (action === "explain") {
      systemPrompt = "You are a helpful assistant. Explain the provided text in simpler terms.";
    } else if (action === "flashcards") {
      systemPrompt = "You are a helpful assistant. Generate a few flashcards based on the provided text. Format them as Q: ... A: ...";
    } else {
      systemPrompt = "You are a helpful assistant.";
    }

    const finalPrompt = prompt ? `${prompt}\n\nContext text: ${text}` : `Text to process: ${text}`;

    // Get the GitHub PAT from environment variables
    const token = process.env.GITHUB_TOKEN || "";

    if (!token) {
      const fallbackStream = new ReadableStream({
        async start(controller) {
          const msg = `⚠️ **Configuration Error**\n\nNo GITHUB_TOKEN detected in .env.local. Please add it to start using free AI features.`;
          controller.enqueue(new TextEncoder().encode(msg));
          controller.close();
        }
      });
      return new Response(fallbackStream, {
        headers: { "Content-Type": "text/plain; charset=utf-8", "Transfer-Encoding": "chunked" }
      });
    }

    // Call GitHub Models API (OpenAI-compatible)
    const url = "https://models.inference.ai.azure.com/chat/completions";
    const payload = {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: finalPrompt }
      ],
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 1024
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorText = "Unknown error";
      try {
        const errorData = await response.json();
        errorText = errorData.message || JSON.stringify(errorData);
      } catch (e) {
        errorText = await response.text();
      }
      
      const fallbackStream = new ReadableStream({
        async start(controller) {
          const msg = `⚠️ **GitHub Models API Error (${response.status})**\n\n${errorText}`;
          controller.enqueue(new TextEncoder().encode(msg));
          controller.close();
        }
      });
      return new Response(fallbackStream, {
        headers: { "Content-Type": "text/plain; charset=utf-8", "Transfer-Encoding": "chunked" }
      });
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content || "No response generated.";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Simulate streaming chunk by chunk so the UI doesn't break
          const chunks = generatedText.match(/.{1,10}/g) || [];
          for (const chunk of chunks) {
            await new Promise(resolve => setTimeout(resolve, 10)); // tiny delay for visual effect
            controller.enqueue(new TextEncoder().encode(chunk));
          }
        } catch (e) {
          console.error("Stream error", e);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Error generating AI response:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
