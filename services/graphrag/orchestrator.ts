import { parseIntentFromQuestion } from "@/services/graphrag/parseIntent";
import { normalizeDetectedEntities } from "@/services/graphrag/normalizeEntities";
import { selectQueryTemplate } from "@/services/graphrag/selectQueryTemplate";
import { executeGraphQuery } from "@/services/graphrag/executeQuery";
import { retryQueryWithFallback } from "@/services/graphrag/retryWithFallback";
import { buildNaturalAnswer } from "@/services/graphrag/generateAnswer";
import { buildGraphPayload } from "@/services/graphrag/buildGraph";
import { generateDynamicCypher } from "@/services/graphrag/generateDynamicCypher";
import { refineCypher } from "@/services/graphrag/refineCypher";
import {
  getLanguageCatalogFromDb,
  getWordCatalogFromDb,
} from "@/lib/entityCatalog";
import { GraphIntent } from "@/types/graphrag";

const KNOWN_WORDS = ["kabar", "kursi", "kantor", "gereja", "agama"];
const KNOWN_LANGUAGES = ["Arab", "Belanda", "Portugis", "Sanskerta"];

// Mode demo untuk pengujian refinement loop.
// - "off"   : sistem berjalan normal
// - "empty" : query dinamis awal sengaja dibuat menghasilkan 0 record
// - "error" : query dinamis awal sengaja dibuat syntax error
const DEMO_MODE: "off" | "empty" | "error" = "off";

function detectEntityFromQuestion(
  question: string,
  candidates: string[]
): string | null {
  const normalizedQuestion = question.toLowerCase();

  for (const candidate of candidates) {
    if (normalizedQuestion.includes(candidate.toLowerCase())) {
      return candidate;
    }
  }

  return null;
}

async function detectWordFromQuestion(question: string): Promise<string | null> {
  const dbWords = await getWordCatalogFromDb();
  const combinedCandidates = Array.from(new Set([...KNOWN_WORDS, ...dbWords]));

  return detectEntityFromQuestion(question, combinedCandidates);
}

async function detectLanguageFromQuestion(
  question: string
): Promise<string | null> {
  const dbLanguages = await getLanguageCatalogFromDb();
  const combinedCandidates = Array.from(
    new Set([...KNOWN_LANGUAGES, ...dbLanguages])
  );

  return detectEntityFromQuestion(question, combinedCandidates);
}

async function detectIntentRuleBased(question: string): Promise<GraphIntent> {
  const normalized = question.toLowerCase();
  const detectedWord = await detectWordFromQuestion(question);
  const detectedLanguage = await detectLanguageFromQuestion(question);

  if (
    (normalized.includes("berasal dari bahasa apa") ||
      normalized.includes("asal bahasa") ||
      normalized.includes("dari bahasa apa") ||
      normalized.includes("bahasa asal") ||
      normalized.includes("bahasa asalnya") ||
      normalized.includes("relasi kata")) &&
    detectedWord
  ) {
    return "origin_of_word";
  }

  if (
    (normalized.includes("semua kata") ||
      normalized.includes("tampilkan semua kata") ||
      normalized.includes("kata apa saja") ||
      normalized.includes("kasih semua kata")) &&
    normalized.includes("bahasa") &&
    detectedLanguage
  ) {
    return "words_by_language";
  }

  if (
    (normalized.includes("akar kata") ||
      normalized.includes("root") ||
      normalized.includes("kata dasar") ||
      normalized.includes("turunan dari")) &&
    detectedWord
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
 *
 * Penjelasan:
 * File ini adalah inti alur sistem.
 * Semua tahap dipanggil dari sini secara berurutan, yaitu:
 * 1. memahami intent user,
 * 2. menormalkan entity,
 * 3. membangkitkan query dinamis,
 * 4. menjalankan query,
 * 5. memperbaiki query bila perlu,
 * 6. fallback ke template,
 * 7. fallback entity,
 * 8. membentuk jawaban,
 * 9. membentuk graph.
 */
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
    // yang juga dibantu catalog dari database.
    intent = await detectIntentRuleBased(question);
    detectedWord = await detectWordFromQuestion(question);
    detectedLanguage = await detectLanguageFromQuestion(question);

    logs.push("Intent parsing failed, switched to rule-based fallback");
  }

  logs.push(`Detected intent: ${intent}`);
  logs.push(`Detected word: ${detectedWord ?? "none"}`);
  logs.push(`Detected language: ${detectedLanguage ?? "none"}`);

  // Tahap 2: muat catalog entity dari database agar
  // data baru hasil CRUD ikut dikenali oleh proses normalisasi.
  const [wordCatalog, languageCatalog] = await Promise.all([
    getWordCatalogFromDb(),
    getLanguageCatalogFromDb(),
  ]);

  logs.push(
    `Entity catalog loaded: ${wordCatalog.length} words, ${languageCatalog.length} languages`
  );

  // Tahap 3: normalisasi entity.
  // Di sini sistem merapikan kata/bahasa yang terdeteksi,
  // termasuk typo ringan, dengan bantuan daftar lokal + catalog DB.
  const normalized = normalizeDetectedEntities(
    detectedWord,
    detectedLanguage,
    wordCatalog,
    languageCatalog
  );

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

  // Tahap 4: menyiapkan query template sebagai fallback aman.
  const templateCypher = selectQueryTemplate(intent);
  let cypher = templateCypher;

  const params: Record<string, string> = {};
  if (detectedWord) params.word = detectedWord;
  if (detectedLanguage) params.language = detectedLanguage;

  // Tahap 5: mencoba membangkitkan query dinamis dengan bantuan LLM.
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

  // Mode demo untuk memaksa sistem masuk ke jalur refinement.
  if (DEMO_MODE === "empty") {
    cypher = `
      MATCH (x:DoesNotExist)
      RETURN x
    `.trim();

    logs.push("Demo mode active: forced empty-result dynamic query");
  }

  if (DEMO_MODE === "error") {
    cypher = `MATCH (w:Word RETURN w`;
    logs.push("Demo mode active: forced malformed dynamic query");
  }

  // Tahap 6: eksekusi query dinamis atau template.
  let execution;
  const usedDynamicQuery = cypher !== templateCypher;

  try {
    execution = await executeGraphQuery(cypher, params);
    logs.push(`Neo4j query executed, records: ${execution.records.length}`);

    // Jika query dinamis tidak error tetapi hasilnya kosong,
    // sistem mencoba memperbaiki query satu kali sebelum fallback.
    if (usedDynamicQuery && execution.records.length === 0) {
      logs.push("Dynamic query returned no records, starting refinement step");

      try {
        const refinedCypher = await refineCypher({
          intent,
          question,
          previousCypher: cypher,
          word: detectedWord,
          language: detectedLanguage,
          failureReason:
            "The query executed successfully but returned zero records.",
        });

        cypher = refinedCypher;
        logs.push("Refined Cypher generated with OpenRouter");

        execution = await executeGraphQuery(cypher, params);
        logs.push(`Refined query executed, records: ${execution.records.length}`);
      } catch (error) {
        console.error("Cypher refinement failed after empty result:", error);
        logs.push("Refinement after empty result failed");

        cypher = templateCypher;
        logs.push("Switched to template query after failed refinement");

        execution = await executeGraphQuery(cypher, params);
        logs.push(`Template query executed, records: ${execution.records.length}`);
      }
    }
  } catch (error) {
    console.error("Dynamic Cypher execution failed:", error);

    // Jika query dinamis gagal saat dieksekusi,
    // sistem mencoba refinement sekali sebelum kembali ke template.
    if (usedDynamicQuery) {
      logs.push("Dynamic query execution failed, starting refinement step");

      try {
        const failureReason =
          error instanceof Error ? error.message : "Unknown execution error";

        const refinedCypher = await refineCypher({
          intent,
          question,
          previousCypher: cypher,
          word: detectedWord,
          language: detectedLanguage,
          failureReason,
        });

        cypher = refinedCypher;
        logs.push("Refined Cypher generated with OpenRouter");

        execution = await executeGraphQuery(cypher, params);
        logs.push(`Refined query executed, records: ${execution.records.length}`);
      } catch (refineError) {
        console.error("Dynamic Cypher refinement execution failed:", refineError);

        cypher = templateCypher;
        logs.push("Refinement failed, switched to template query");

        execution = await executeGraphQuery(cypher, params);
        logs.push(`Template query executed, records: ${execution.records.length}`);
      }
    } else {
      throw error;
    }
  }

  // Tahap 7: jika hasil masih kosong, coba fallback resolution berbasis entity.
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

  // Tahap 8: membentuk jawaban akhir berdasarkan records hasil query.
  const answer = buildNaturalAnswer({
    intent,
    records: execution.records,
    word: detectedWord,
    language: detectedLanguage,
  });
  logs.push("Answer generated successfully");

  // Tahap 9: membentuk graph payload untuk divisualisasikan di Cytoscape.
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