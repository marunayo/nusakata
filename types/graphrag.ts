/**
 * Tahap: Shared Types and Validation Schema
 * Peran: Menyimpan tipe data dan schema validasi utama GraphRAG.
 * Input: Data dari request, service internal, dan response.
 * Output: Struktur data yang konsisten di seluruh sistem.
 *
 * Penjelasan:
 * File ini dipakai untuk menjaga agar format data
 * tetap konsisten antar tahap.
 * Selain tipe TypeScript, file ini juga berisi schema Zod
 * untuk validasi input dan output.
 *
 * Dengan file ini, sistem menjadi lebih aman
 * dan lebih mudah dirawat.
 */
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

export const CytoscapeNodeSchema = z.object({
  data: z.object({
    id: z.string(),
    label: z.string(),
    type: z.string(),
  }),
});

export const CytoscapeEdgeSchema = z.object({
  data: z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    label: z.string(),
  }),
});

export const GraphElementsSchema = z.object({
  nodes: z.array(CytoscapeNodeSchema).default([]),
  edges: z.array(CytoscapeEdgeSchema).default([]),
});

export type CytoscapeNode = z.infer<typeof CytoscapeNodeSchema>;
export type CytoscapeEdge = z.infer<typeof CytoscapeEdgeSchema>;
export type GraphElements = z.infer<typeof GraphElementsSchema>;

export const GraphRagResponseSchema = z.object({
  ok: z.boolean(),
  question: z.string(),
  intent: GraphIntentSchema,
  detectedWord: z.string().nullable(),
  detectedLanguage: z.string().nullable(),
  cypher: z.string().nullable(),
  answer: z.string(),
  records: z.array(GenericRecordSchema).default([]),
  graph: GraphElementsSchema,
  logs: z.array(z.string()).default([]),
});

export type GraphRagResponse = z.infer<typeof GraphRagResponseSchema>;