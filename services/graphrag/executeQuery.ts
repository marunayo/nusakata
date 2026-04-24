import driver from "@/lib/neo4j";
import { GenericRecordSchema } from "@/types/graphrag";

/**
 * Tahap: Query Execution
 * Peran: Menjalankan query Cypher ke Neo4j.
 * Input: Query Cypher dan parameter query.
 * Output: Records hasil eksekusi query dalam format sederhana.
 *
 * Penjelasan:
 * Semua value dari Neo4j dinormalisasi menjadi string
 * agar tetap kompatibel dengan schema record GraphRAG
 * yang fleksibel.
 */
export async function executeGraphQuery(
  cypher: string,
  params: Record<string, string>
) {
  const session = driver.session();

  try {
    const result = await session.run(cypher, params);

    const records = result.records.map((record) => {
      const row = record.toObject();

      const normalized = Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          key,
          value == null ? "" : String(value),
        ])
      );

      return GenericRecordSchema.parse(normalized);
    });

    return { records };
  } finally {
    await session.close();
  }
}