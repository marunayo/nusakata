/**
 * Tahap: Database-backed Fallback Utility
 * Peran: Mencari kandidat entity langsung dari database.
 * Input: Entity input user dan tipe entity (word/language).
 * Output: Kandidat entity terbaik dari database, jika ada.
 *
 * Penjelasan:
 * Jika entity yang dipakai pada query pertama belum cocok,
 * sistem dapat mencoba mencari kandidat yang lebih dekat
 * langsung dari isi database Neo4j.
 *
 * Dengan cara ini, fallback tidak hanya bergantung
 * pada daftar lokal, tetapi juga pada data nyata
 * yang tersimpan di graph database.
 */
import driver from "@/lib/neo4j";

type EntityType = "word" | "language";

type FallbackResult = {
  found: boolean;
  value: string | null;
  source: "local" | "database" | "none";
};

// Fungsi ini mencari kandidat entity terbaik langsung dari database,
// lalu mengembalikan kandidat yang paling dekat dengan input user.
function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[a.length][b.length];
}

function findBestCandidate(input: string, candidates: string[], maxDistance = 3) {
  let best: { value: string; distance: number } | null = null;

  for (const candidate of candidates) {
    const distance = levenshtein(input.toLowerCase(), candidate.toLowerCase());

    if (!best || distance < best.distance) {
      best = { value: candidate, distance };
    }
  }

  if (!best || best.distance > maxDistance) {
    return null;
  }

  return best.value;
}

export async function findFallbackEntityInDatabase(
  input: string,
  type: EntityType
): Promise<FallbackResult> {
  const session = driver.session();

  try {
    let cypher = "";
    let field = "";

    if (type === "word") {
      cypher = `
        MATCH (w:Word)
        RETURN w.lemma AS value
      `;
      field = "value";
    } else {
      cypher = `
        MATCH (l:Language)
        RETURN l.name AS value
      `;
      field = "value";
    }

    const result = await session.run(cypher);
    const values = result.records
      .map((record) => String(record.get(field)))
      .filter(Boolean);

    const best = findBestCandidate(input, values);

    if (!best) {
      return {
        found: false,
        value: null,
        source: "none",
      };
    }

    return {
      found: true,
      value: best,
      source: "database",
    };
  } finally {
    await session.close();
  }
}