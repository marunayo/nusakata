import { callOpenRouter } from "@/lib/openrouter";
import { GraphIntent } from "@/types/graphrag";

type RefineCypherArgs = {
  intent: GraphIntent;
  question: string;
  previousCypher: string;
  word: string | null;
  language: string | null;
  failureReason: string;
};

function extractCypher(text: string): string {
  return text
    .replace(/```cypher/gi, "")
    .replace(/```/g, "")
    .trim();
}

/**
 * Tahap: Query Refinement
 * Peran: Meminta model memperbaiki query Cypher yang gagal atau kosong.
 * Input: query sebelumnya, alasan kegagalan, intent, dan entity.
 * Output: query Cypher revisi yang siap dicoba kembali.
 *
 * Penjelasan:
 * Tahap ini membuat sistem lebih agentic.
 * Jika query awal tidak berhasil, model diberi konteks singkat
 * tentang masalahnya, lalu diminta menyusun query yang lebih baik.
 */
export async function refineCypher({
  intent,
  question,
  previousCypher,
  word,
  language,
  failureReason,
}: RefineCypherArgs): Promise<string> {
  const systemPrompt = `
You are refining a Cypher query for a Neo4j-based Indonesian etymology system.

Return ONLY one corrected Cypher query.
Do not explain anything.
Do not use markdown unless absolutely necessary.
Do not add commentary before or after the query.

Schema:
- (:Word { lemma, meaning })
- (:Language { name, family })
- (:RootForm { form, gloss })

Relationships:
- (:Word)-[:ORIGIN_LANGUAGE]->(:Language)
- (:Word)-[:DERIVED_FROM]->(:RootForm)

Preferred return fields:
- origin_of_word -> word, root_form, origin_language
- words_by_language -> word, root_form, origin_language
- root_of_word -> word, root_form, gloss

Use parameters if relevant:
- $word
- $language

Keep the query simple and valid for Neo4j.
Fix the query based on the failure reason.
`.trim();

  const userPrompt = `
Question:
${question}

Intent:
${intent}

Detected word:
${word ?? "null"}

Detected language:
${language ?? "null"}

Previous Cypher:
${previousCypher}

Failure reason:
${failureReason}

Please provide a corrected Cypher query now.
`.trim();

  const content = await callOpenRouter([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  return extractCypher(content);
}