import { normalizeLanguage, normalizeWord } from "@/lib/entityNormalization";

/**
 * Tahap: Entity Normalization
 * Peran: Merapikan entity hasil parsing agar cocok dengan data sistem.
 * Input: detectedWord, detectedLanguage, serta kandidat word/language dari DB.
 * Output: Entity final yang siap dipakai pada query.
 */

export function normalizeDetectedEntities(
  detectedWord: string | null,
  detectedLanguage: string | null,
  availableWords: string[] = [],
  availableLanguages: string[] = []
) {
  const logs: string[] = [];

  const normalizedWordResult = normalizeWord(detectedWord, availableWords);
  const normalizedLanguageResult = normalizeLanguage(
    detectedLanguage,
    availableLanguages
  );

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