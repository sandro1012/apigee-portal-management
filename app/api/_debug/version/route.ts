export async function GET() {
  const tag = process.env.NEXT_PUBLIC_BUILD_TAG || "local";
  const when = new Date().toISOString();
  return new Response(JSON.stringify({ tag, when }), {
    headers: { "content-type": "application/json" },
  });
}
