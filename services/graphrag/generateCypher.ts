import { callOpenRouter } from "@/lib/openrouter";
import { GRAPH_SCHEMA_TEXT } from "@/lib/schema";

export async function generateCypherFromQuestion(question: string) {
  const systemPrompt = `
You are a Cypher query generator for Neo4j.
Only use the provided schema.
Return only raw Cypher, no markdown fences, no explanation.
If the question asks for a word's origin language, generate a query that returns:
- word
- origin_language
Use parameterized Cypher with $lemma whenever possible.
Schema:
${GRAPH_SCHEMA_TEXT}
`.trim();

  const userPrompt = `
Question:
${question}

Example output format:
MATCH (w:Word {lemma: $lemma})-[:ORIGIN_LANGUAGE]->(l:Language)
RETURN w.lemma AS word, l.name AS origin_language
LIMIT 1
`.trim();

  const content = await callOpenRouter([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  return content;
}