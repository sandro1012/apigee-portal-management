import { z } from "zod";

export const httpMethodEnum = z.enum(["GET","POST","PUT","PATCH","DELETE","HEAD","OPTIONS","TRACE"]);

export const operationSchema = z.object({
  resource: z.string().min(1, "Path obrigatório, ex.: /"),
  methods: z.array(httpMethodEnum).optional().default([]),
});

export const quotaSchema = z.object({
  limit: z.string().optional(),
  interval: z.string().optional(),
  timeUnit: z.string().optional(),
}).partial();

export const attributeSchema = z.object({
  name: z.string().min(1),
  value: z.string().optional().default(""),
});

export const operationConfigSchema = z.object({
  apiSource: z.string().min(1, "Proxy (apiSource) obrigatório"),
  operations: z.array(operationSchema).min(1, "Inclua ao menos 1 operação"),
  quota: quotaSchema.optional(),
  attributes: z.array(attributeSchema).optional(),
});

export const operationGroupSchema = z.object({
  operationConfigs: z.array(operationConfigSchema).min(1, "Inclua ao menos 1 Operation Config"),
});

export type HttpMethod = z.infer<typeof httpMethodEnum>;
export type Operation = z.infer<typeof operationSchema>;
export type Quota = z.infer<typeof quotaSchema>;
export type Attribute = z.infer<typeof attributeSchema>;
export type OperationConfig = z.infer<typeof operationConfigSchema>;
export type OperationGroupPayload = z.infer<typeof operationGroupSchema>;
