import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt, action, text } = await req.json();

    const encoder = new TextEncoder();
    
    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        let simulatedResponse = "";
        
        if (action === "summarize") {
          simulatedResponse = `Here is a summary of the highlighted text:\n\nThe selected passage discusses key concepts that can be condensed into a few main points. It highlights the importance of the core subject matter and provides context. (This is a simulated AI response since no API key is provided).`;
        } else if (action === "explain") {
          simulatedResponse = `Let me explain this in simpler terms:\n\nThe text "${text.substring(0, 30)}..." essentially means that the underlying system or concept works by following specific rules. Think of it like a set of instructions. (Simulated AI response).`;
        } else {
          simulatedResponse = `I've analyzed your highlight. Based on what you selected, here are some thoughts: This is a very interesting section of the document that warrants further review. (Simulated AI response).`;
        }

        const words = simulatedResponse.split(" ");
        
        for (let i = 0; i < words.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 50)); // simulate typing delay
          controller.enqueue(encoder.encode(words[i] + " "));
        }
        
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
