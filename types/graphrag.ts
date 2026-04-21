import { z } from "zod";

export const AskGraphSchema = z.object({
  question: z
    .string()
    .min(1, "Pertanyaan wajib diisi")
    .max(300, "Pertanyaan terlalu panjang"),
});

export type AskGraphRequest = z.infer<typeof AskGraphSchema>;

export const GraphIntentSchema = z.enum([
  "origin_of_word",
  "words_by_language",
  "root_of_word",
  "unknown",
]);

export type GraphIntent = z.infer<typeof GraphIntentSchema>;

export const SemanticIntentResultSchema = z.object({
  intent: GraphIntentSchema,
  word: z.string().nullable(),
  language: z.string().nullable(),
});

export type SemanticIntentResult = z.infer<typeof SemanticIntentResultSchema>;

export const GenericRecordSchema = z.record(z.string(), z.string());

export type GenericRecord = z.infer<typeof GenericRecordSchema>;

export const GraphRagResponseSchema = z.object({
  ok: z.boolean(),
  question: z.string(),
  intent: GraphIntentSchema,
  detectedWord: z.string().nullable(),
  detectedLanguage: z.string().nullable(),
  cypher: z.string().nullable(),
  answer: z.string(),
  records: z.array(GenericRecordSchema).default([]),
  logs: z.array(z.string()).default([]),
});

export type GraphRagResponse = z.infer<typeof GraphRagResponseSchema>;