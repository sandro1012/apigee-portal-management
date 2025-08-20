// TODO: implementar replace (delete+create+entries) via REST do Apigee.
// Por ora, endpoint retorna 501 para lembrar que é um esqueleto.
export async function POST(req: Request) {
  return new Response(JSON.stringify({error:"Not implemented yet"}), {status:501});
}