import { GraphIntent } from "@/types/graphrag";

type BuildAnswerArgs = {
  intent: GraphIntent;
  records: Record<string, string>[];
  word: string | null;
  language: string | null;
};

function relationLabel(relationType?: string): string {
  switch (relationType) {
    case "BORROWED_FROM":
      return "dipinjam dari";
    case "COGNATE_WITH":
      return "berkognat dengan";
    case "DERIVED_FROM":
    default:
      return "berasal dari";
  }
}

/**
 * Tahap: Answer Generation
 * Peran: Membentuk jawaban natural language dari hasil query.
 * Input: intent, records hasil query, dan entity final.
 * Output: Jawaban akhir yang mudah dibaca user.
 */
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
    const relationType = records[0].relation_type;
    const relText = relationLabel(relationType);

    if (
      rootForm &&
      resultWord &&
      rootForm.toLowerCase() !== resultWord.toLowerCase()
    ) {
      if (relationType === "COGNATE_WITH") {
        return `Kata "${resultWord}" berkognat dengan "${rootForm}" dan berhubungan dengan bahasa ${originLanguage}.`;
      }

      return `Kata "${resultWord}" ${relText} kata "${rootForm}" yang berhubungan dengan bahasa ${originLanguage}.`;
    }

    return `Kata "${resultWord}" berhubungan dengan bahasa ${originLanguage}.`;
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
    const relationType = records[0].relation_type;
    const relText = relationLabel(relationType);

    if (relationType === "COGNATE_WITH") {
      return `Kata "${records[0].word}" berkognat dengan "${records[0].root_form}" yang bermakna "${records[0].gloss}".`;
    }

    return `Kata "${records[0].word}" ${relText} "${records[0].root_form}" yang bermakna "${records[0].gloss}".`;
  }

  return "Jawaban berhasil dibuat.";
}