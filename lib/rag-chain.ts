export async function buildRetriever(rawText: string) {
  const { RecursiveCharacterTextSplitter } = await import("@langchain/textsplitters");
  const { HuggingFaceTransformersEmbeddings } = await import("@langchain/community/embeddings/hf_transformers");
  const { MemoryVectorStore } = await import("langchain/vectorstores/memory");

  const embeddings = new HuggingFaceTransformersEmbeddings({
    model: "Xenova/all-MiniLM-L6-v2",
  });

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 150 });
  const docs = await splitter.createDocuments([rawText]);
  const vectorstore = await MemoryVectorStore.fromDocuments(docs, embeddings);
  return vectorstore.asRetriever({ k: 4 });
}

export async function askQuestion(retriever: any, question: string) {
  const { RunnableSequence, RunnablePassthrough } = await import("@langchain/core/runnables");
  const { ChatPromptTemplate } = await import("@langchain/core/prompts");
  const { StringOutputParser } = await import("@langchain/core/output_parsers");
  const { ChatGroq } = await import("@langchain/groq");

  const formatDocs = (docs: any[]) =>
    docs.map((d, i) => `[${i + 1}] ${d.pageContent}`).join("\n\n");

  const prompt = ChatPromptTemplate.fromTemplate(
    `Answer the question using only the context below. Cite sources like [1].
Context:
{context}

Question: {question}`
  );

  const model = new ChatGroq({ model: "openai/gpt-oss-120b", temperature: 0.2 });

  const chain = RunnableSequence.from([
    { context: retriever.pipe(formatDocs), question: new RunnablePassthrough() },
    prompt,
    model,
    new StringOutputParser(),
  ]);

  return chain.invoke(question);
}