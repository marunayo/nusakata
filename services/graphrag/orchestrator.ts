/**
 * Tahap: GraphRAG Orchestrator
 * Peran: Mengatur urutan seluruh proses GraphRAG dari awal sampai akhir.
 * Input: Pertanyaan user dalam bentuk string.
 * Output: Objek hasil GraphRAG yang siap dikirim ke frontend.
 *
 * Penjelasan:
 * File ini adalah inti alur sistem.
 * Semua tahap dipanggil dari sini secara berurutan, yaitu:
 * 1. memahami intent user,
 * 2. menormalkan entity,
 * 3. memilih query,
 * 4. menjalankan query,
 * 5. melakukan fallback bila perlu,
 * 6. membentuk jawaban,
 * 7. membentuk graph.
 *
 * File ini cocok dijadikan titik utama saat menjelaskan alur GraphRAG ke dosen.
 */
import { parseIntentFromQuestion } from "@/services/graphrag/parseIntent";
import { normalizeDetectedEntities } from "@/services/graphrag/normalizeEntities";
import { selectQueryTemplate } from "@/services/graphrag/selectQueryTemplate";
import { executeGraphQuery } from "@/services/graphrag/executeQuery";
import { retryQueryWithFallback } from "@/services/graphrag/retryWithFallback";
import { buildNaturalAnswer } from "@/services/graphrag/generateAnswer";
import { buildGraphPayload } from "@/services/graphrag/buildGraph";
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

export async function runGraphRag(question: string) {
  const logs: string[] = [];

  logs.push("Request received");
  logs.push("Question accepted for GraphRAG processing");

  let intent: GraphIntent = "unknown";
  let detectedWord: string | null = null;
  let detectedLanguage: string | null = null;

  // Tahap 1: memahami maksud pertanyaan user.
  // Sistem mencoba memakai OpenRouter terlebih dahulu agar lebih fleksibel
  // terhadap variasi bahasa alami.
  try {
    const parsed = await parseIntentFromQuestion(question);
    intent = parsed.intent;
    detectedWord = parsed.word;
    detectedLanguage = parsed.language;

    logs.push("Intent parsed with OpenRouter");
  } catch (error) {
    console.error("Intent parsing failed:", error);

    // Jika parsing semantik gagal, sistem memakai fallback rule-based
    // agar aplikasi tetap bisa merespons.
    intent = detectIntentRuleBased(question);
    detectedWord = detectWordFromQuestion(question);
    detectedLanguage = detectLanguageFromQuestion(question);

    logs.push("Intent parsing failed, switched to rule-based fallback");
  }

  logs.push(`Detected intent: ${intent}`);
  logs.push(`Detected word: ${detectedWord ?? "none"}`);
  logs.push(`Detected language: ${detectedLanguage ?? "none"}`);

  // Tahap 2: normalisasi entity.
  // Di sini sistem merapikan kata/bahasa yang terdeteksi,
  // termasuk perbedaan huruf besar-kecil dan typo ringan.
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

  // Tahap 3: memilih query template.
  // Query tidak dibuat bebas oleh LLM, tetapi dipilih dari template
  // yang aman berdasarkan intent agar hasil lebih stabil.
  const cypher = selectQueryTemplate(intent);
  logs.push(`Query template selected for intent: ${intent}`);
  logs.push("Cypher prepared");

  const params: Record<string, string> = {};
  if (detectedWord) params.word = detectedWord;
  if (detectedLanguage) params.language = detectedLanguage;

  // Tahap 4: menjalankan query utama ke Neo4j.
  let execution = await executeGraphQuery(cypher, params);
  logs.push(`Neo4j query executed, records: ${execution.records.length}`);

  // Tahap 5: jika hasil kosong, sistem mencoba fallback resolution.
  // Ini membuat sistem lebih tahan terhadap entity yang belum tepat.
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

  // Tahap 6: membentuk jawaban akhir dari records hasil query.
  const answer = buildNaturalAnswer({
    intent,
    records: execution.records,
    word: detectedWord,
    language: detectedLanguage,
  });
  logs.push("Answer generated successfully");

  // Tahap 7: membentuk graph payload untuk divisualisasikan di Cytoscape.
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