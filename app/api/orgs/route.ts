export async function GET() {
  // Lê da env var (se existir), senão usa uma lista exemplo
  const raw = process.env.GOOGLE_APIGEE_ORGS;
  const list = raw ? raw.split(',').map(s=>s.trim()).filter(Boolean) : [
    "vtal-apigeehybrid-qa",
    "vtal-apigeehyb-qa",
    "vtal-apigeeintegracao-hml",
    "vtal-apigeehybrid-dev",
    "vtal-apigeehybrid-prd",
    "vtal-apigeehyb-trg",
    "vtal-apigeeintegracao-prd"
  ];
  return Response.json(list);
}