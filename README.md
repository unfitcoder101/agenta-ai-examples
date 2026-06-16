# RAG Chatbot with Agenta Tracing

A streaming RAG (Retrieval-Augmented Generation) chatbot built with Vercel AI SDK, Next.js, and Groq — with every LLM call traced in [Agenta](https://agenta.ai).

## Live Demo
🔗 [agenta-ai-examples.vercel.app](https://agenta-ai-examples.vercel.app)

## What it does
- Upload any PDF (under 4MB)
- Ask questions about it
- Get streaming AI answers based on document content
- Every LLM call is observable in Agenta's dashboard

## Stack
- **Next.js 16** — App Router
- **Vercel AI SDK v5** — streaming, useChat hook
- **Groq** — LLaMA 3.3 70B (free tier)
- **Agenta** — LLM observability and tracing
- **pdf-parse** — PDF text extraction

## How it works
1. PDF is uploaded → text extracted → chunked into 500-char segments
2. User query → keyword-based retrieval → top 3 chunks selected
3. Chunks injected into system prompt → Groq streams the answer
4. Every request traced in Agenta Observability dashboard

## Setup

```bash
git clone https://github.com/unfitcoder101/agenta-ai-examples
cd agenta-ai-examples
npm install
```

Create `.env.local`:
```
GROQ_API_KEY=your_groq_key
AGENTA_API_KEY=your_agenta_key
```

```bash
npm run dev
```

## Agenta Tracing
Open [cloud.agenta.ai](https://cloud.agenta.ai) → Observability → All to see live traces of every LLM call.

## Author
Built by [@unfitcoder101](https://github.com/unfitcoder101) as part of the official Agenta examples.
