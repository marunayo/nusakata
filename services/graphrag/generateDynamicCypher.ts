import { callOpenRouter } from "@/lib/openrouter";
import { GraphIntent } from "@/types/graphrag";

type GenerateDynamicCypherArgs = {
  intent: GraphIntent;
  question: string;
  word: string | null;
  language: string | null;
};

function extractCypher(text: string): string {
  const cleaned = text
    .replace(/```cypher/gi, "")
    .replace(/```/g, "")
    .trim();

  return cleaned;
}

/**
 * Tahap: Dynamic Cypher Generation
 * Peran: Membuat kandidat query Cypher secara lebih dinamis dengan bantuan LLM.
 * Input: intent, pertanyaan user, kata target, dan bahasa target.
 * Output: query Cypher kandidat yang akan dicoba lebih dulu.
 *
 * Penjelasan:
 * Tahap ini adalah langkah awal menuju text-to-Cypher yang lebih dinamis.
 * Sistem tetap memakai intent sebagai guardrail, tetapi query tidak langsung
 * diambil dari template. Model diberi konteks schema dan diminta membuat query
 * sesuai intent yang sudah dipahami sebelumnya.
 */
export async function generateDynamicCypher({
  intent,
  question,
  word,
  language,
}: GenerateDynamicCypherArgs): Promise<string> {
  const systemPrompt = `
You are a Cypher generator for a Neo4j-based Indonesian etymology application.

Your job is to generate ONE valid Cypher query only.
Do not explain anything.
Do not return markdown unless absolutely necessary.
Return only the Cypher query.

Graph schema:
- (:Word { lemma, meaning })
- (:Language { name, family })
- (:RootForm { form, gloss })

Relationships:
- (:Word)-[:ORIGIN_LANGUAGE]->(:Language)
- (:Word)-[:DERIVED_FROM]->(:RootForm)

Intent meanings:
- origin_of_word:
  find the word, its root form if available, and its origin language
- words_by_language:
  find all words from a specific language, and root form if available
- root_of_word:
  find the root form and gloss of a word

Important constraints:
- Use provided parameters if available.
- Prefer parameter names:
  $word
  $language
- For origin_of_word, prefer returning:
  word, root_form, origin_language
- For words_by_language, prefer returning:
  word, root_form, origin_language
- For root_of_word, prefer returning:
  word, root_form, gloss
- Keep the query simple and executable in Neo4j.
`.trim();

  const userPrompt = `
Question:
${question}

Detected intent:
${intent}

Detected word:
${word ?? "null"}

Detected language:
${language ?? "null"}

Generate the Cypher query now.
`.trim();

  const content = await callOpenRouter([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  return extractCypher(content);
}