import { z } from "zod";

export const apiResourcesSchema = z.object({
  apiResources: z.array(z.string().min(1)).min(0),
});

export type ApiResourcesPayload = z.infer<typeof apiResourcesSchema>;
