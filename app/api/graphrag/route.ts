import { NextRequest, NextResponse } from "next/server";
import driver from "@/lib/neo4j";
import {
  AskGraphSchema,
  GraphIntent,
  GraphRagResponseSchema,
  GenericRecordSchema,
} from "@/types/graphrag";

const KNOWN_WORDS = ["kabar", "kursi", "kantor", "gereja", "agama"];
const KNOWN_LANGUAGES = ["Arab", "Belanda", "Portugis", "Sanskerta"];

function detectWordFromQuestion(question: string): string | null {
  const normalized = question.toLowerCase();

  for (const word of KNOWN_WORDS) {
    if (normalized.includes(word)) {
      return word;
    }
  }

  return null;
}

function detectLanguageFromQuestion(question: string): string | null {
  const normalized = question.toLowerCase();

  for (const language of KNOWN_LANGUAGES) {
    if (normalized.includes(language.toLowerCase())) {
      return language;
    }
  }

  return null;
}

function detectIntent(question: string): GraphIntent {
  const normalized = question.toLowerCase();

  if (
    (normalized.includes("berasal dari bahasa apa") ||
      normalized.includes("asal bahasa")) &&
    detectWordFromQuestion(question)
  ) {
    return "origin_of_word";
  }

  if (
    (normalized.includes("semua kata") ||
      normalized.includes("tampilkan semua kata") ||
      normalized.includes("kata apa saja")) &&
    normalized.includes("bahasa") &&
    detectLanguageFromQuestion(question)
  ) {
    return "words_by_language";
  }

  if (
    (normalized.includes("akar kata") ||
      normalized.includes("root") ||
      normalized.includes("turunan dari")) &&
    detectWordFromQuestion(question)
  ) {
    return "root_of_word";
  }

  return "unknown";
}

function getCypherByIntent(intent: GraphIntent): string | null {
  switch (intent) {
    case "origin_of_word":
      return `
        MATCH (w:Word {lemma: $word})-[:ORIGIN_LANGUAGE]->(l:Language)
        RETURN w.lemma AS word, l.name AS origin_language
        LIMIT 1
      `.trim();

    case "words_by_language":
      return `
        MATCH (w:Word)-[:ORIGIN_LANGUAGE]->(l:Language {name: $language})
        RETURN w.lemma AS word, l.name AS origin_language
        ORDER BY w.lemma
      `.trim();

    case "root_of_word":
      return `
        MATCH (w:Word {lemma: $word})-[:DERIVED_FROM]->(r:RootForm)
        RETURN w.lemma AS word, r.form AS root_form, r.gloss AS gloss
        LIMIT 1
      `.trim();

    default:
      return null;
  }
}

function buildAnswer(
  intent: GraphIntent,
  records: Record<string, string>[],
  word: string | null,
  language: string | null
): string {
  if (records.length === 0) {
    if (intent === "origin_of_word" && word) {
      return `Data asal bahasa untuk kata "${word}" tidak ditemukan.`;
    }

    if (intent === "words_by_language" && language) {
      return `Tidak ditemukan kata yang berasal dari bahasa ${language}.`;
    }

    if (intent === "root_of_word" && word) {
      return `Data akar kata untuk "${word}" tidak ditemukan.`;
    }

    return "Tidak ada data yang ditemukan.";
  }

  if (intent === "origin_of_word") {
    return `Kata "${records[0].word}" berasal dari bahasa ${records[0].origin_language}.`;
  }

  if (intent === "words_by_language") {
    const words = records.map((record) => record.word).join(", ");
    return `Kata yang berasal dari bahasa ${language} adalah: ${words}.`;
  }

  if (intent === "root_of_word") {
    return `Akar kata dari "${records[0].word}" adalah "${records[0].root_form}" yang bermakna "${records[0].gloss}".`;
  }

  return "Jawaban berhasil dibuat.";
}

export async function GET() {
  const session = driver.session();

  try {
    const result = await session.run("RETURN 'Neo4j connected' AS message");
    const message = result.records[0]?.get("message");

    return NextResponse.json({
      ok: true,
      message,
    });
  } catch (error) {
    console.error("Neo4j connection error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to connect to Neo4j Aura",
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

export async function POST(req: NextRequest) {
  const session = driver.session();
  const logs: string[] = [];

  try {
    logs.push("Request received");

    const body = await req.json();
    const parsed = AskGraphSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Request tidak valid",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    logs.push("Request validated with Zod");

    const question = parsed.data.question;
    const detectedWord = detectWordFromQuestion(question);
    const detectedLanguage = detectLanguageFromQuestion(question);
    const intent = detectIntent(question);

    logs.push(`Detected intent: ${intent}`);
    logs.push(`Detected word: ${detectedWord ?? "none"}`);
    logs.push(`Detected language: ${detectedLanguage ?? "none"}`);

    if (intent === "unknown") {
      const payload = GraphRagResponseSchema.parse({
        ok: true,
        question,
        intent,
        detectedWord,
        detectedLanguage,
        cypher: null,
        answer:
          "Saya belum memahami tipe pertanyaan ini. Coba gunakan pola seperti: 'Kata kabar berasal dari bahasa apa?', 'Tampilkan semua kata dari bahasa Arab', atau 'Akar kata dari kantor apa?'",
        records: [],
        logs,
      });

      return NextResponse.json(payload);
    }

    const cypher = getCypherByIntent(intent);

    if (!cypher) {
      throw new Error("No Cypher available for detected intent.");
    }

    logs.push("Cypher selected from intent template");
    logs.push(`Cypher: ${cypher}`);

    const params: Record<string, string> = {};

    if (detectedWord) {
      params.word = detectedWord;
      params.lemma = detectedWord;
    }

    if (detectedLanguage) {
      params.language = detectedLanguage;
    }

    const result = await session.run(cypher, params);

    logs.push(`Neo4j query executed, records: ${result.records.length}`);

    const records = result.records.map((record) => {
      const row = record.toObject();

      const normalized = Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, String(value)])
      );

      return GenericRecordSchema.parse(normalized);
    });

    const answer = buildAnswer(intent, records, detectedWord, detectedLanguage);
    logs.push("Answer generated from query result");

    const payload = GraphRagResponseSchema.parse({
      ok: true,
      question,
      intent,
      detectedWord,
      detectedLanguage,
      cypher,
      answer,
      records,
      logs,
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error("POST /api/graphrag error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Terjadi kesalahan pada server",
        logs,
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}