import { z } from "zod";

export const AskGraphSchema = z.object({
  question: z
    .string()
    .min(1, "Pertanyaan wajib diisi")
    .max(300, "Pertanyaan terlalu panjang"),
});

export type AskGraphRequest = z.infer<typeof AskGraphSchema>;

export const SimpleGraphResultSchema = z.object({
  word: z.string(),
  origin_language: z.string(),
});

export type SimpleGraphResult = z.infer<typeof SimpleGraphResultSchema>;

export const GraphRagResponseSchema = z.object({
  ok: z.boolean(),
  question: z.string(),
  detectedWord: z.string().nullable(),
  cypher: z.string().nullable(),
  answer: z.string(),
  records: z.array(SimpleGraphResultSchema).default([]),
  logs: z.array(z.string()).default([]),
});

export type GraphRagResponse = z.infer<typeof GraphRagResponseSchema>;