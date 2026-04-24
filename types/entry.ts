import { z } from "zod";

/**
 * Tahap: Shared Schema for Etymology Entry
 * Peran: Menyimpan schema validasi untuk CRUD entri etimologi.
 *
 * Komponen utama:
 * - lemma
 * - meaning
 * - rootForm
 * - originLanguage
 * - relationType
 *
 * Komponen tambahan:
 * - gloss
 * - languageFamily
 * - historicalPeriod
 * - notes
 * - sourceReference
 */
export const RelationTypeSchema = z.enum([
  "DERIVED_FROM",
  "BORROWED_FROM",
  "COGNATE_WITH",
]);

export const EtymologyEntrySchema = z.object({
  lemma: z.string().min(1, "Lemma wajib diisi").max(100),
  meaning: z.string().min(1, "Makna kata wajib diisi").max(300),

  rootForm: z.string().min(1, "Kata asal wajib diisi").max(100),
  originLanguage: z.string().min(1, "Bahasa asal wajib diisi").max(100),
  relationType: RelationTypeSchema.default("DERIVED_FROM"),

  gloss: z.string().optional().default(""),
  languageFamily: z.string().optional().default(""),
  historicalPeriod: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  sourceReference: z.string().optional().default(""),
});

export type EtymologyEntry = z.infer<typeof EtymologyEntrySchema>;

export const EtymologyEntryResponseSchema = z.object({
  ok: z.boolean(),
  data: z.array(EtymologyEntrySchema).default([]),
  message: z.string().optional(),
});

export type EtymologyEntryResponse = z.infer<
  typeof EtymologyEntryResponseSchema
>;