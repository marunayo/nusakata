import { buildGraphFromRecords } from "@/lib/cytoscape";
import { GenericRecord, GraphIntent } from "@/types/graphrag";

/**
 * Tahap: Graph Payload Construction
 * Peran: Menyiapkan data graph untuk divisualisasikan di frontend.
 * Input: intent dan records hasil query.
 * Output: payload graph berisi nodes dan edges.
 */
export function buildGraphPayload(
  intent: GraphIntent,
  records: GenericRecord[]
) {
  return buildGraphFromRecords(intent, records);
}