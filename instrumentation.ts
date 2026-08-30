export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { NodeTracerProvider, SimpleSpanProcessor } = await import("@opentelemetry/sdk-trace-node");                   
    const { OTLPTraceExporter } = await import("@opentelemetry/exporter-trace-otlp-proto");
    const { resourceFromAttributes } = await import("@opentelemetry/resources");                 
    const { ATTR_SERVICE_NAME } = await import("@opentelemetry/semantic-conventions");

    const AGENTA_HOST = process.env.AGENTA_HOST || "https://cloud.agenta.ai";
    const AGENTA_API_KEY = process.env.AGENTA_API_KEY;                

    const otlpExporter = new OTLPTraceExporter({
      url: `${AGENTA_HOST}/api/otlp/v1/traces`,
      headers: { Authorization: `ApiKey ${AGENTA_API_KEY}` },
    });              

    const tracerProvider = new NodeTracerProvider({
      resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: "rag-chatbot-vercel" }),
      spanProcessors: [new SimpleSpanProcessor(otlpExporter)],                  
    });
    tracerProvider.register();
  }
}
