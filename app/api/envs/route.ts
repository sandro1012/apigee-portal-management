const ORG_ENVS: Record<string, string[]> = {
  "vtal-apigeehybrid-qa": ["env-apigeehybrid-ti1","env-apigeehybrid-ti1-dmz","env-apigeehybrid-ti2","env-apigeehybrid-ti2-dmz"],
  "vtal-apigeehyb-qa": ["env-apigeehyb-ti1-interno","env-apigeehyb-ti1-dmz","env-apigeehyb-ti2-interno","env-apigeehyb-ti2-dmz"],
  "vtal-apigeeintegracao-hml": ["cw-trg"],
  "vtal-apigeehybrid-dev": ["env-apigeehybrid-dev"],
  "vtal-apigeehybrid-prd": ["env-apigeehybrid-prd"],
  "vtal-apigeehyb-trg": ["env-apigeehyb-trg"],
  "vtal-apigeeintegracao-prd": ["env-cwprd"]
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const org = searchParams.get('org') || '';
  const envs = ORG_ENVS[org] || [];
  return Response.json(envs);
}