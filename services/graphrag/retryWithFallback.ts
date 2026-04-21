/**
 * Tahap: Fallback and Retry
 * Peran: Mencoba ulang query jika hasil pertama kosong.
 * Input: Query, parameter, dan entity yang sudah terdeteksi.
 * Output: Hasil query baru setelah fallback bila diperlukan.
 *
 * Penjelasan:
 * Jika query pertama tidak menghasilkan records,
 * sistem belum langsung berhenti.
 * Sebagai gantinya, sistem mencoba mencari kandidat entity lain
 * yang lebih cocok, lalu menjalankan query ulang.
 *
 * Tahap ini membuat sistem lebih tahan terhadap typo,
 * entity yang kurang tepat, atau variasi input user.
 */
import { findFallbackEntityInDatabase } from "@/lib/entityFallback";
import { executeGraphQuery } from "@/services/graphrag/executeQuery";

type RetryArgs = {
  cypher: string;
  params: Record<string, string>;
  detectedWord: string | null;
  detectedLanguage: string | null;
};

// Fungsi ini dipakai saat query pertama tidak menghasilkan records.
// Sistem akan mencoba fallback untuk kata atau bahasa,
// lalu menjalankan query ulang jika ditemukan kandidat yang lebih cocok.
export async function retryQueryWithFallback({
  cypher,
  params,
  detectedWord,
  detectedLanguage,
}: RetryArgs) {
  const logs: string[] = [];
  logs.push("No records found on first attempt, starting fallback resolution");

  let retried = false;

  if (detectedWord) {
    const fallbackWord = await findFallbackEntityInDatabase(detectedWord, "word");

    if (fallbackWord.found && fallbackWord.value && fallbackWord.value !== detectedWord) {
      logs.push(
        `Word fallback applied: ${detectedWord} -> ${fallbackWord.value} [${fallbackWord.source}]`
      );
      detectedWord = fallbackWord.value;
      params.word = detectedWord;
      retried = true;
    }
  }

  if (detectedLanguage) {
    const fallbackLanguage = await findFallbackEntityInDatabase(
      detectedLanguage,
      "language"
    );

    if (
      fallbackLanguage.found &&
      fallbackLanguage.value &&
      fallbackLanguage.value !== detectedLanguage
    ) {
      logs.push(
        `Language fallback applied: ${detectedLanguage} -> ${fallbackLanguage.value} [${fallbackLanguage.source}]`
      );
      detectedLanguage = fallbackLanguage.value;
      params.language = detectedLanguage;
      retried = true;
    }
  }

  if (!retried) {
    logs.push("No fallback candidate found");
    const execution = await executeGraphQuery(cypher, params);

    return {
      execution,
      detectedWord,
      detectedLanguage,
      logs,
    };
  }

  const execution = await executeGraphQuery(cypher, params);
  logs.push(`Fallback retry executed, records: ${execution.records.length}`);

  return {
    execution,
    detectedWord,
    detectedLanguage,
    logs,
  };
}