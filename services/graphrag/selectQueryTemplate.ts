import { GraphIntent } from "@/types/graphrag";

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
export function selectQueryTemplate(intent: GraphIntent): string {
  switch (intent) {
    case "origin_of_word":
      return `
        MATCH (w:Word {lemma: $word})-[rel]->(r:RootForm)
        MATCH (w)-[:ORIGIN_LANGUAGE]->(l:Language)
        RETURN
          w.lemma AS word,
          r.form AS root_form,
          l.name AS origin_language,
          type(rel) AS relation_type
        LIMIT 1
      `.trim();

    case "words_by_language":
      return `
        MATCH (w:Word)-[:ORIGIN_LANGUAGE]->(l:Language {name: $language})
        OPTIONAL MATCH (w)-[rel]->(r:RootForm)
        RETURN
          w.lemma AS word,
          r.form AS root_form,
          l.name AS origin_language,
          type(rel) AS relation_type
        ORDER BY w.lemma
      `.trim();

    case "root_of_word":
      return `
        MATCH (w:Word {lemma: $word})-[rel]->(r:RootForm)
        RETURN
          w.lemma AS word,
          r.form AS root_form,
          r.gloss AS gloss,
          type(rel) AS relation_type
        LIMIT 1
      `.trim();

    default:
      throw new Error("No Cypher template available for the detected intent.");
  }
}