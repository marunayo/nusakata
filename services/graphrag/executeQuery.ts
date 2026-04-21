/**
 * Tahap: Query Execution
 * Peran: Menjalankan query Cypher ke Neo4j.
 * Input: Query Cypher dan parameter query.
 * Output: Records hasil eksekusi query.
 *
 * Penjelasan:
 * File ini hanya fokus pada proses akses database.
 * Query yang sudah dipilih akan dijalankan ke Neo4j,
 * lalu hasilnya diubah ke format record sederhana
 * agar mudah diproses oleh tahap berikutnya.
 *
 * Pemisahan tahap ini membuat logika database
 * tidak bercampur dengan logic intent atau jawaban.
 */
import driver from "@/lib/neo4j";
import { GenericRecordSchema } from "@/types/graphrag";

// Fungsi ini menjalankan query Cypher ke Neo4j
// dan mengubah hasilnya ke format record sederhana.
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
        Object.entries(row).map(([key, value]) => [key, String(value)])
      );

      return GenericRecordSchema.parse(normalized);
    });

    return { records };
  } finally {
    await session.close();
  }
}