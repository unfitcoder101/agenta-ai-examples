import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatGroq } from "@langchain/groq";
import type { Document } from "@langchain/core/documents";
import { createEmbeddings } from "@/lib/groq-embeddings";
import { AgentaTracingHandler } from "@/lib/agenta-callback-handler";

const embeddings = createEmbeddings();

async function buildRetriever(rawText: string) {
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 150 });
  const docs = await splitter.createDocuments([rawText]);
  const vectorstore = await MemoryVectorStore.fromDocuments(docs, embeddings);
  return vectorstore.asRetriever({ k: 4 });
}

const formatDocs = (docs: Document[]) =>
  docs.map((d, i) => `[${i + 1}] ${d.pageContent}`).join("\n\n");

const prompt = ChatPromptTemplate.fromTemplate(
  `Answer the question using only the context below. Cite sources like [1].
Context:
{context}

Question: {question}`
);

const model = new ChatGroq({ model: "openai/gpt-oss-120b", temperature: 0.2 });

async function askQuestion(retriever: Awaited<ReturnType<typeof buildRetriever>>, question: string) {
  const chain = RunnableSequence.from([
    { context: retriever.pipe(formatDocs), question: new RunnablePassthrough() },
    prompt,
    model,
    new StringOutputParser(),
  ]);
  const handler = new AgentaTracingHandler();
  return chain.invoke(question, { callbacks: [handler] });
}

export async function POST(req: Request) {
  const { question, documentText } = await req.json();
  const retriever = await buildRetriever(documentText);
  const answer = await askQuestion(retriever, question);
  return Response.json({ answer });
}
