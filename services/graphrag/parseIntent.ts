import { callOpenRouter } from "@/lib/openrouter";
import {
  SemanticIntentResult,
  SemanticIntentResultSchema,
} from "@/types/graphrag";

function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in OpenRouter response.");
  }

  return text.slice(start, end + 1);
}

export async function parseIntentFromQuestion(
  question: string
): Promise<SemanticIntentResult> {
  const systemPrompt = `
You are an intent parser for an Indonesian etymology application.

Your task is to analyze a user question and return JSON only with this shape:
{
  "intent": "origin_of_word" | "words_by_language" | "root_of_word" | "unknown",
  "word": string | null,
  "language": string | null
}

Intent definitions:
- origin_of_word:
  asking the origin language of a specific word
  examples:
  "Kata kabar berasal dari bahasa apa?"
  "Kantor itu dari bahasa apa ya?"
  "Apa bahasa asal kata kursi?"

- words_by_language:
  asking for all words from a specific language
  examples:
  "Tampilkan semua kata dari bahasa Arab"
  "Kata apa saja yang berasal dari bahasa Belanda?"
  "Kasih semua kata dari bahasa Arab"

- root_of_word:
  asking the root/base form of a specific word
  examples:
  "Akar kata dari kantor apa?"
  "Root kata kantor apa?"
  "Kata dasar dari kantor apa?"

- unknown:
  use this only if the question does not fit the three intents above

Rules:
- Return valid JSON only
- Preserve Indonesian entity names if possible
- For language names, use proper capitalization like:
  "Arab", "Belanda", "Portugis", "Sanskerta"
- For words, use lowercase base form like:
  "kabar", "kursi", "kantor", "gereja", "agama"
`.trim();

  const userPrompt = `Question: ${question}`;

  const content = await callOpenRouter([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  const jsonText = extractJsonObject(content);
  const parsed = JSON.parse(jsonText);

  return SemanticIntentResultSchema.parse(parsed);
}