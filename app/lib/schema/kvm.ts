import { z } from "zod";

export const kvmEntrySchema = z.object({
  name: z.string().min(1, "name obrigatório"),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

export const kvmSchema = z.object({
  keyValueEntries: z.array(kvmEntrySchema).default([]),
  nextPageToken: z.string().optional(),
});

export type KvmPayload = z.infer<typeof kvmSchema>;
