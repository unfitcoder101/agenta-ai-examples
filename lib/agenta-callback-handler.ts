import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { Span } from "@opentelemetry/api";
import { tracer } from "./tracing";

export class AgentaTracingHandler extends BaseCallbackHandler {
  name = "AgentaTracingHandler";
  private spans = new Map<string, Span>();

  handleChainStart(chain: any, inputs: any, runId: string) {
    const span = tracer.startSpan(`chain:${chain?.id?.at(-1) ?? "unknown"}`);
    span.setAttribute("ag.data.inputs", JSON.stringify(inputs).slice(0, 2000));
    this.spans.set(runId, span);
  }
  handleChainEnd(outputs: any, runId: string) {
    this.spans.get(runId)?.end();
    this.spans.delete(runId);
  }
  handleRetrieverStart(_retriever: any, query: string, runId: string) {
    const span = tracer.startSpan("retriever:vector-search");
    span.setAttribute("ag.data.inputs", query);
    this.spans.set(runId, span);
  }
  handleRetrieverEnd(documents: any[], runId: string) {
    const span = this.spans.get(runId);
    span?.setAttribute("retrieved_chunks", documents.length);
    span?.end();
    this.spans.delete(runId);
  }
  handleLLMStart(llm: any, prompts: string[], runId: string) {
    const span = tracer.startSpan(`llm:${llm?.id?.at(-1) ?? "groq"}`);
    span.setAttribute("ag.data.inputs", prompts.join("\n").slice(0, 2000));
    this.spans.set(runId, span);
  }
  handleLLMEnd(_output: any, runId: string) {
    this.spans.get(runId)?.end();
    this.spans.delete(runId);
  }
}