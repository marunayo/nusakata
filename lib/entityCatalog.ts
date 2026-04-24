import driver from "@/lib/neo4j";

/**
 * Tahap: Entity Catalog Utility
 * Peran: Mengambil daftar kata dan bahasa langsung dari database.
 * Input: Tidak ada input langsung dari user.
 * Output: Daftar lemma dan nama bahasa yang tersimpan di Neo4j.
 *
 * Penjelasan:
 * File ini dipakai agar GraphRAG tidak hanya bergantung
 * pada daftar statis di kode. Dengan begitu, data baru hasil CRUD
 * bisa langsung ikut dikenali oleh sistem.
 */

export async function getWordCatalogFromDb(): Promise<string[]> {
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (w:Word)
      RETURN w.lemma AS lemma
      ORDER BY w.lemma
    `);

    return result.records
      .map((record) => String(record.get("lemma") ?? "").trim())
      .filter(Boolean);
  } finally {
    await session.close();
  }
}

export async function getLanguageCatalogFromDb(): Promise<string[]> {
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (l:Language)
      RETURN l.name AS name
      ORDER BY l.name
    `);

    return result.records
      .map((record) => String(record.get("name") ?? "").trim())
      .filter(Boolean);
  } finally {
    await session.close();
  }
}