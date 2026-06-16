import { createGroq } from "@ai-sdk/groq";
import { streamText } from "ai";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY?.trim() });

function retrieveChunks(query: string, text: string, topK = 3): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += 500) chunks.push(text.slice(i, i + 500));
  const words = query.toLowerCase().split(" ");
  return chunks
    .map((chunk) => ({ chunk, score: words.filter((w) => chunk.toLowerCase().includes(w)).length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((r) => r.chunk);
}

function convertMessages(messages: any[]) {
  return messages.map((m) => ({
    role: m.role,
    content: typeof m.content === "string"
      ? m.content
      : Array.isArray(m.parts)
        ? m.parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join(" ")
        : "",
  }));
}

export const maxDuration = 30;

export async function POST(req: Request) {
  const body = await req.json();
  console.log("FULL BODY KEYS:", Object.keys(body));
  console.log("pdfContext length:", body.pdfContext?.length ?? "NOT PRESENT");
  
  const rawMessages = body.messages ?? [];
  const pdfContext = body.pdfContext ?? "";

  const lastMessage = rawMessages[rawMessages.length - 1];
  let query = "";
  if (typeof lastMessage?.content === "string") query = lastMessage.content;
  else if (Array.isArray(lastMessage?.parts)) {
    query = lastMessage.parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join(" ");
  }

  const context = pdfContext
    ? `Context from document:\n${retrieveChunks(query, pdfContext).join("\n\n")}`
    : "No document uploaded yet.";

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: `You are a helpful assistant. Answer based on the context below.\n\n${context}`,
    messages: convertMessages(rawMessages),
  });

  return result.toUIMessageStreamResponse();
}
