import { NextRequest, NextResponse } from "next/server";

export const pdfChunks: string[] = [];

function chunkText(text: string, size = 500): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 4MB." }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(buffer);

    const chunks = chunkText(parsed.text);
    pdfChunks.length = 0;
    pdfChunks.push(...chunks);

    return NextResponse.json({ chunks: chunks.length, text: parsed.text.slice(0, 15000) });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
