/**
 * Tahap: Entity Normalization
 * Peran: Merapikan entity hasil parsing agar cocok dengan data sistem.
 * Input: detectedWord dan detectedLanguage dari tahap intent parsing.
 * Output: Entity final yang siap dipakai pada query.
 *
 * Penjelasan:
 * Hasil parsing awal belum tentu langsung cocok dengan data.
 * Karena itu, tahap ini dipakai untuk:
 * - merapikan huruf besar/kecil,
 * - memperbaiki typo ringan,
 * - mencocokkan entity dengan daftar yang dikenali sistem.
 *
 * Tahap ini penting agar query ke database menjadi lebih stabil.
 */
import { normalizeLanguage, normalizeWord } from "@/lib/entityNormalization";

// Fungsi ini menerima entity hasil deteksi awal,
// lalu mencoba menormalkannya agar lebih cocok dengan data yang tersedia.
// Selain hasil normalisasi, fungsi ini juga mengembalikan logs
// agar prosesnya mudah ditelusuri.
export function normalizeDetectedEntities(
  detectedWord: string | null,
  detectedLanguage: string | null
) {
  const logs: string[] = [];

  const normalizedWordResult = normalizeWord(detectedWord);
  const normalizedLanguageResult = normalizeLanguage(detectedLanguage);

  if (detectedWord) {
    if (normalizedWordResult.matched) {
      logs.push(
        `Word normalized: ${detectedWord} -> ${normalizedWordResult.normalized} [${normalizedWordResult.strategy}]`
      );
      detectedWord = normalizedWordResult.normalized;
    } else {
      logs.push(`Word normalization failed: ${detectedWord}`);
    }
  }

  if (detectedLanguage) {
    if (normalizedLanguageResult.matched) {
      logs.push(
        `Language normalized: ${detectedLanguage} -> ${normalizedLanguageResult.normalized} [${normalizedLanguageResult.strategy}]`
      );
      detectedLanguage = normalizedLanguageResult.normalized;
    } else {
      logs.push(`Language normalization failed: ${detectedLanguage}`);
    }
  }

  logs.push(`Final word: ${detectedWord ?? "none"}`);
  logs.push(`Final language: ${detectedLanguage ?? "none"}`);

  return {
    word: detectedWord,
    language: detectedLanguage,
    logs,
  };
}