import { parseIntentFromQuestion } from "@/services/graphrag/parseIntent";
import { normalizeDetectedEntities } from "@/services/graphrag/normalizeEntities";
import { selectQueryTemplate } from "@/services/graphrag/selectQueryTemplate";
import { executeGraphQuery } from "@/services/graphrag/executeQuery";
import { retryQueryWithFallback } from "@/services/graphrag/retryWithFallback";
import { buildNaturalAnswer } from "@/services/graphrag/generateAnswer";
import { buildGraphPayload } from "@/services/graphrag/buildGraph";
import { generateDynamicCypher } from "@/services/graphrag/generateDynamicCypher";
import { GraphIntent } from "@/types/graphrag";

const KNOWN_WORDS = ["kabar", "kursi", "kantor", "gereja", "agama"];
const KNOWN_LANGUAGES = ["Arab", "Belanda", "Portugis", "Sanskerta"];

function detectWordFromQuestion(question: string): string | null {
  const normalized = question.toLowerCase();

  for (const word of KNOWN_WORDS) {
    if (normalized.includes(word)) return word;
  }

  return null;
}

function detectLanguageFromQuestion(question: string): string | null {
  const normalized = question.toLowerCase();

  for (const language of KNOWN_LANGUAGES) {
    if (normalized.includes(language.toLowerCase())) return language;
  }

  return null;
}

function detectIntentRuleBased(question: string): GraphIntent {
  const normalized = question.toLowerCase();

  if (
    (normalized.includes("berasal dari bahasa apa") ||
      normalized.includes("asal bahasa") ||
      normalized.includes("dari bahasa apa") ||
      normalized.includes("bahasa asal") ||
      normalized.includes("bahasa asalnya") ||
      normalized.includes("relasi kata")) &&
    detectWordFromQuestion(question)
  ) {
    return "origin_of_word";
  }

  if (
    (normalized.includes("semua kata") ||
      normalized.includes("tampilkan semua kata") ||
      normalized.includes("kata apa saja") ||
      normalized.includes("kasih semua kata")) &&
    normalized.includes("bahasa") &&
    detectLanguageFromQuestion(question)
  ) {
    return "words_by_language";
  }

  if (
    (normalized.includes("akar kata") ||
      normalized.includes("root") ||
      normalized.includes("kata dasar") ||
      normalized.includes("turunan dari")) &&
    detectWordFromQuestion(question)
  ) {
    return "root_of_word";
  }

  return "unknown";
}

/**
 * Tahap: GraphRAG Orchestrator
 * Peran: Mengatur urutan seluruh proses GraphRAG dari awal sampai akhir.
 * Input: Pertanyaan user dalam bentuk string.
 * Output: Objek hasil GraphRAG yang siap dikirim ke frontend.
 */
export async function runGraphRag(question: string) {
  const logs: string[] = [];

  logs.push("Request received");
  logs.push("Question accepted for GraphRAG processing");

  let intent: GraphIntent = "unknown";
  let detectedWord: string | null = null;
  let detectedLanguage: string | null = null;

  // Tahap 1: memahami maksud pertanyaan user.
  try {
    const parsed = await parseIntentFromQuestion(question);
    intent = parsed.intent;
    detectedWord = parsed.word;
    detectedLanguage = parsed.language;

    logs.push("Intent parsed with OpenRouter");
  } catch (error) {
    console.error("Intent parsing failed:", error);

    intent = detectIntentRuleBased(question);
    detectedWord = detectWordFromQuestion(question);
    detectedLanguage = detectLanguageFromQuestion(question);

    logs.push("Intent parsing failed, switched to rule-based fallback");
  }

  logs.push(`Detected intent: ${intent}`);
  logs.push(`Detected word: ${detectedWord ?? "none"}`);
  logs.push(`Detected language: ${detectedLanguage ?? "none"}`);

  // Tahap 2: normalisasi entity.
  const normalized = normalizeDetectedEntities(detectedWord, detectedLanguage);
  detectedWord = normalized.word;
  detectedLanguage = normalized.language;
  logs.push(...normalized.logs);

  if (intent === "unknown") {
    return {
      ok: true,
      question,
      intent,
      detectedWord,
      detectedLanguage,
      cypher: null,
      answer:
        "Saya belum memahami tipe pertanyaan ini. Coba gunakan pola seperti: 'Kata kabar berasal dari bahasa apa?', 'Tampilkan semua kata dari bahasa Arab', atau 'Akar kata dari kantor apa?'",
      records: [],
      graph: {
        nodes: [],
        edges: [],
      },
      logs,
    };
  }

  // Tahap 3: siapkan query template sebagai fallback.
  const templateCypher = selectQueryTemplate(intent);
  let cypher = templateCypher;

  const params: Record<string, string> = {};
  if (detectedWord) params.word = detectedWord;
  if (detectedLanguage) params.language = detectedLanguage;

  // Tahap 4: coba bangkitkan query dinamis dengan LLM.
  try {
    cypher = await generateDynamicCypher({
      intent,
      question,
      word: detectedWord,
      language: detectedLanguage,
    });

    logs.push("Dynamic Cypher generated with OpenRouter");
  } catch (error) {
    console.error("Dynamic Cypher generation failed:", error);
    cypher = templateCypher;
    logs.push("Dynamic Cypher generation failed, switched to template query");
  }

  logs.push(`Cypher prepared for intent: ${intent}`);

  // Tahap 5: eksekusi query.
  let execution;
  try {
    execution = await executeGraphQuery(cypher, params);
    logs.push(`Neo4j query executed, records: ${execution.records.length}`);
  } catch (error) {
    console.error("Dynamic Cypher execution failed:", error);

    cypher = templateCypher;
    logs.push("Dynamic query execution failed, switched to template query");

    execution = await executeGraphQuery(cypher, params);
    logs.push(`Template query executed, records: ${execution.records.length}`);
  }

  // Tahap 6: jika hasil kosong, coba fallback resolution.
  if (execution.records.length === 0) {
    const retried = await retryQueryWithFallback({
      cypher,
      params,
      detectedWord,
      detectedLanguage,
    });

    logs.push(...retried.logs);

    execution = retried.execution;
    detectedWord = retried.detectedWord;
    detectedLanguage = retried.detectedLanguage;
  }

  // Tahap 7: bentuk jawaban natural language.
  const answer = buildNaturalAnswer({
    intent,
    records: execution.records,
    word: detectedWord,
    language: detectedLanguage,
  });
  logs.push("Answer generated successfully");

  // Tahap 8: bentuk graph untuk Cytoscape.
  const graph = buildGraphPayload(intent, execution.records);
  logs.push(
    `Graph built successfully: ${graph.nodes.length} nodes, ${graph.edges.length} edges`
  );

  return {
    ok: true,
    question,
    intent,
    detectedWord,
    detectedLanguage,
    cypher,
    answer,
    records: execution.records,
    graph,
    logs,
  };
}