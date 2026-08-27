import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pdf-parse",
    "@xenova/transformers",
    "onnxruntime-node",
    "@opentelemetry/sdk-trace-node",
    "@opentelemetry/exporter-trace-otlp-proto",
    "@opentelemetry/resources",
    "@opentelemetry/semantic-conventions",
    "@opentelemetry/api",
  ],
};

export default nextConfig;