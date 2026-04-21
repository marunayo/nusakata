/**
 * Tahap: Answer Generation
 * Peran: Membentuk jawaban natural language dari hasil query.
 * Input: Intent, records hasil query, dan entity final.
 * Output: Jawaban akhir yang mudah dibaca user.
 *
 * Penjelasan:
 * Hasil query Neo4j masih berupa record terstruktur.
 * Karena itu, tahap ini dipakai untuk mengubahnya
 * menjadi jawaban dalam bahasa yang natural.
 *
 * Format jawaban akan menyesuaikan intent,
 * misalnya untuk:
 * - asal bahasa kata,
 * - daftar kata dari suatu bahasa,
 * - akar kata.
 */
import { GraphIntent } from "@/types/graphrag";

type BuildAnswerArgs = {
  intent: GraphIntent;
  records: Record<string, string>[];
  word: string | null;
  language: string | null;
};

// Fungsi ini membentuk jawaban natural language
// berdasarkan intent dan records hasil query.
export function buildNaturalAnswer({
  intent,
  records,
  word,
  language,
}: BuildAnswerArgs): string {
  if (records.length === 0) {
    if (intent === "origin_of_word" && word) {
      return `Data etimologi untuk kata "${word}" tidak ditemukan.`;
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
    const resultWord = records[0].word;
    const rootForm = records[0].root_form;
    const originLanguage = records[0].origin_language;

    if (
      rootForm &&
      resultWord &&
      rootForm.toLowerCase() !== resultWord.toLowerCase()
    ) {
      return `Kata "${resultWord}" berasal dari kata "${rootForm}" yang berasal dari bahasa ${originLanguage}.`;
    }

    return `Kata "${resultWord}" berasal dari bahasa ${originLanguage}.`;
  }

  if (intent === "words_by_language") {
    const words = records.map((record) => record.word).filter(Boolean);

    if (words.length === 1) {
      return `Kata yang berasal dari bahasa ${language} adalah ${words[0]}.`;
    }

    if (words.length === 2) {
      return `Kata yang berasal dari bahasa ${language} adalah ${words[0]} dan ${words[1]}.`;
    }

    const allButLast = words.slice(0, -1).join(", ");
    const last = words[words.length - 1];

    return `Beberapa kata yang berasal dari bahasa ${language} adalah ${allButLast}, dan ${last}.`;
  }

  if (intent === "root_of_word") {
    return `Akar kata dari "${records[0].word}" adalah "${records[0].root_form}" yang bermakna "${records[0].gloss}".`;
  }

  return "Jawaban berhasil dibuat.";
}