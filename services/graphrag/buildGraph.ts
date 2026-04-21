/**
 * Tahap: Graph Payload Construction
 * Peran: Menyiapkan data graph untuk divisualisasikan di frontend.
 * Input: Intent dan records hasil query.
 * Output: Payload graph berisi nodes dan edges.
 *
 * Penjelasan:
 * Records hasil query belum langsung bisa divisualisasikan.
 * Karena itu, tahap ini mengubah hasil query
 * menjadi struktur graph yang dapat dipakai oleh Cytoscape.
 *
 * Dengan cara ini, alur etimologi bisa ditampilkan
 * dalam bentuk relasi visual yang lebih mudah dipahami.
 */
import { buildGraphFromRecords } from "@/lib/cytoscape";
import { GraphIntent, GenericRecord } from "@/types/graphrag";

// Fungsi ini mengubah records hasil query
// menjadi payload graph yang siap dipakai frontend.
export function buildGraphPayload(
  intent: GraphIntent,
  records: GenericRecord[]
) {
  return buildGraphFromRecords(intent, records);
}