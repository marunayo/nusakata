import { z } from "zod";

/**
 * Tahap: Shared Schema for Etymology Entry
 * Peran: Menyimpan schema validasi dan tipe data untuk CRUD entri etimologi.
 * Input: Data form atau payload API.
 * Output: Struktur data yang konsisten untuk create, read, update, dan delete.
 */
export const EtymologyEntrySchema = z.object({
  word: z.string().min(1, "Word wajib diisi").max(100),
  meaning: z.string().optional().default(""),
  rootForm: z.string().min(1, "Root form wajib diisi").max(100),
  gloss: z.string().optional().default(""),
  originLanguage: z.string().min(1, "Origin language wajib diisi").max(100),
  languageFamily: z.string().optional().default(""),
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