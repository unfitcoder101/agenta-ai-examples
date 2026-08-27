const http = require("node:http");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { OllamaEmbeddings } = require("@langchain/ollama");
const { MemoryVectorStore } = require("@langchain/classic/vectorstores/memory");
const { RunnableSequence, RunnablePassthrough } = require("@langchain/core/runnables");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { ChatGroq } = require("@langchain/groq");
const { trace } = require("@opentelemetry/api");
const { NodeTracerProvider, SimpleSpanProcessor } = require("@opentelemetry/sdk-trace-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-proto");
const { resourceFromAttributes } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME } = require("@opentelemetry/semantic-conventions");

const AGENTA_HOST = process.env.AGENTA_HOST || "https://cloud.agenta.ai";
const AGENTA_API_KEY = process.env.AGENTA_API_KEY;

const otlpExporter = new OTLPTraceExporter({
  url: `${AGENTA_HOST}/api/otlp/v1/traces`,
  headers: { Authorization: `ApiKey ${AGENTA_API_KEY}` },
});
const tracerProvider = new NodeTracerProvider({
  resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: "rag-service" }),
  spanProcessors: [new SimpleSpanProcessor(otlpExporter)],
});
tracerProvider.register();
const tracer = trace.getTracer("rag-service");

const embeddings = new OllamaEmbeddings({ model: "nomic-embed-text" });

async function buildRetriever(rawText) {
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 150 });
  const docs = await splitter.createDocuments([rawText]);
  const vectorstore = await MemoryVectorStore.fromDocuments(docs, embeddings);
  return vectorstore.asRetriever({ k: 4 });
}

const formatDocs = (docs) => docs.map((d, i) => `[${i + 1}] ${d.pageContent}`).join("\n\n");

const prompt = ChatPromptTemplate.fromTemplate(
  `Answer the question using only the context below. Cite sources like [1].\nContext:\n{context}\n\nQuestion: {question}`
);

const model = new ChatGroq({ model: "openai/gpt-oss-120b", temperature: 0.2 });

async function askQuestion(retriever, question) {
  const chain = RunnableSequence.from([
    { context: retriever.pipe(formatDocs), question: new RunnablePassthrough() },
    prompt,
    model,
    new StringOutputParser(),
  ]);

  return tracer.startActiveSpan("rag-chain", async (span) => {
    try {
      span.setAttribute("ag.data.inputs", question);
      const result = await chain.invoke(question);
      span.setAttribute("ag.data.outputs", result);
      return result;
    } finally {
      span.end();
    }
  });
}

const server = http.createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/ask") {
    res.writeHead(404);
    res.end();
    return;
  }
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    try {
      const { documentText, question } = JSON.parse(body);
      const retriever = await buildRetriever(documentText);
      const answer = await askQuestion(retriever, question);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ answer }));
    } catch (err) {
      console.error(err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err) }));
    }
  });
});

server.listen(3001, () => console.log("RAG service listening on :3001"));
