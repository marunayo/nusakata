/**
 * Tahap: Query Template Selection
 * Peran: Memilih template query Cypher berdasarkan intent.
 * Input: Intent hasil pemahaman pertanyaan user.
 * Output: Query Cypher yang sesuai.
 *
 * Penjelasan:
 * Sistem tidak membangun query secara bebas di tahap ini.
 * Sebagai gantinya, sistem memilih query template
 * yang sudah disiapkan berdasarkan intent.
 *
 * Pendekatan ini menjaga query tetap aman, stabil,
 * dan lebih mudah dijelaskan secara akademik.
 */
import { GraphIntent } from "@/types/graphrag";

// Fungsi ini mengubah intent menjadi query Cypher yang sesuai.
// Setiap intent memiliki template query sendiri.
export function selectQueryTemplate(intent: GraphIntent): string {
  switch (intent) {
    case "origin_of_word":
      return `
        MATCH (w:Word {lemma: $word})-[:DERIVED_FROM]->(r:RootForm)
        MATCH (w)-[:ORIGIN_LANGUAGE]->(l:Language)
        RETURN w.lemma AS word, r.form AS root_form, l.name AS origin_language
        LIMIT 1
      `.trim();

    case "words_by_language":
      return `
        MATCH (w:Word)-[:ORIGIN_LANGUAGE]->(l:Language {name: $language})
        OPTIONAL MATCH (w)-[:DERIVED_FROM]->(r:RootForm)
        RETURN w.lemma AS word, r.form AS root_form, l.name AS origin_language
        ORDER BY w.lemma
      `.trim();

    case "root_of_word":
      return `
        MATCH (w:Word {lemma: $word})-[:DERIVED_FROM]->(r:RootForm)
        RETURN w.lemma AS word, r.form AS root_form, r.gloss AS gloss
        LIMIT 1
      `.trim();

    default:
      throw new Error("No Cypher template available for the detected intent.");
  }
}