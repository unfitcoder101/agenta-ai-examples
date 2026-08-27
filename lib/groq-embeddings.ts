import { Embeddings, type EmbeddingsParams } from "@langchain/core/embeddings";

export class GroqEmbeddings extends Embeddings {
  private apiKey: string;
  private model: string;

  constructor(params: EmbeddingsParams & { apiKey: string; model?: string }) {
    super(params);
    this.apiKey = params.apiKey;
    this.model = params.model ?? "nomic-embed-text-v1_5";
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const res = await fetch("https://api.groq.com/openai/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.model, input: texts }),
    });
    if (!res.ok) {
      throw new Error(`Groq embeddings request failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    return data.data.map((d: any) => d.embedding);
  }

  async embedQuery(text: string): Promise<number[]> {
    const [embedding] = await this.embedDocuments([text]);
    return embedding;
  }
}