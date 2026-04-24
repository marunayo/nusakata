import { callOpenRouter } from "@/lib/openrouter";
import { GraphIntent } from "@/types/graphrag";

type GenerateDynamicCypherArgs = {
  intent: GraphIntent;
  question: string;
  word: string | null;
  language: string | null;
};

function extractCypher(text: string): string {
  return text.replace(/```cypher/gi, "").replace(/```/g, "").trim();
}

/**
 * Tahap: Dynamic Cypher Generation
 * Peran: Membuat kandidat query Cypher secara dinamis dengan bantuan LLM.
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

Return ONLY one valid Cypher query.
Do not explain anything.
Do not return markdown unless absolutely necessary.
Do not add commentary before or after the query.

Graph schema:
- (:Word { lemma, meaning, historicalPeriod, notes, sourceReference })
- (:Language { name, family })
- (:RootForm { form, gloss })

Relationships:
- (:Word)-[:ORIGIN_LANGUAGE]->(:Language)
- (:Word)-[:DERIVED_FROM]->(:RootForm)
- (:Word)-[:BORROWED_FROM]->(:RootForm)
- (:Word)-[:COGNATE_WITH]->(:RootForm)

Intent meanings:
- origin_of_word:
  find the word, its root form if available, its relation type, and its origin language
- words_by_language:
  find all words from a specific language, and root form if available
- root_of_word:
  find the root form, gloss, and relation type of a word

Preferred return fields:
- origin_of_word -> word, root_form, origin_language, relation_type
- words_by_language -> word, root_form, origin_language, relation_type
- root_of_word -> word, root_form, gloss, relation_type

Use parameters if relevant:
- $word
- $language

Keep the query simple and executable in Neo4j.
Avoid unsupported labels or relationships.
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