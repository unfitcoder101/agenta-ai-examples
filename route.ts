export async function POST(req: Request) {
  const body = await req.text();
  const upstream = await fetch("http://localhost:3001/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await upstream.json();
  return Response.json(data);
}