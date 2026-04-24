import { z } from "zod";

/**
 * Tahap: Shared Types and Validation Schema
 * Peran: Menyimpan tipe data dan schema utama untuk fitur GraphRAG.
 * Input: Request API, records hasil query Neo4j, dan response akhir.
 * Output: Struktur data yang konsisten antar layer aplikasi.
 */

export const GraphIntentSchema = z.enum([
  "origin_of_word",
  "words_by_language",
  "root_of_word",
  "unknown",
]);

export type GraphIntent = z.infer<typeof GraphIntentSchema>;

export const AskGraphSchema = z.object({
  question: z.string().min(1, "Question wajib diisi"),
});

export type AskGraphRequest = z.infer<typeof AskGraphSchema>;

/**
 * Record hasil query Neo4j dibuat fleksibel agar:
 * - tetap bisa menerima field lama
 * - bisa menerima field baru seperti relation_type
 * - tidak mudah rusak saat query dinamis mengembalikan kolom tambahan
 */
export const GenericRecordSchema = z.record(z.string(), z.string());

export type GenericRecord = z.infer<typeof GenericRecordSchema>;

export const CytoscapeNodeSchema = z.object({
  data: z.object({
    id: z.string(),
    label: z.string(),
    type: z.enum(["word", "root_form", "language"]),
  }),
});

export type CytoscapeNode = z.infer<typeof CytoscapeNodeSchema>;

export const CytoscapeEdgeSchema = z.object({
  data: z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    label: z.string(),
  }),
});

export type CytoscapeEdge = z.infer<typeof CytoscapeEdgeSchema>;

export const GraphPayloadSchema = z.object({
  nodes: z.array(CytoscapeNodeSchema).default([]),
  edges: z.array(CytoscapeEdgeSchema).default([]),
});

export type GraphPayload = z.infer<typeof GraphPayloadSchema>;

export const ParsedIntentResultSchema = z.object({
  intent: GraphIntentSchema,
  word: z.string().nullable(),
  language: z.string().nullable(),
});

export type ParsedIntentResult = z.infer<typeof ParsedIntentResultSchema>;

export const GraphRagResponseSchema = z.object({
  ok: z.boolean(),
  question: z.string(),
  intent: GraphIntentSchema,
  detectedWord: z.string().nullable(),
  detectedLanguage: z.string().nullable(),
  cypher: z.string().nullable(),
  answer: z.string(),
  records: z.array(GenericRecordSchema).default([]),
  graph: GraphPayloadSchema,
  logs: z.array(z.string()).default([]),
});

export type GraphRagResponse = z.infer<typeof GraphRagResponseSchema>;