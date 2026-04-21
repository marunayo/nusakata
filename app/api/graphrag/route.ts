/**
 * Tahap: API Entry Point
 * Peran: Menjadi pintu masuk request dari frontend ke alur GraphRAG.
 * Input: HTTP request yang berisi pertanyaan user.
 * Output: HTTP response berisi hasil akhir GraphRAG.
 *
 * Penjelasan:
 * File ini sengaja dibuat ringan agar mudah dipahami.
 * Tugas utamanya hanya:
 * 1. menerima request,
 * 2. memvalidasi input,
 * 3. memanggil orchestrator GraphRAG,
 * 4. mengirimkan response kembali ke frontend.
 *
 * Semua logika utama dipindahkan ke service lain
 * agar alur sistem lebih modular dan mudah dipresentasikan.
 */
import { NextRequest, NextResponse } from "next/server";
import { AskGraphSchema, GraphRagResponseSchema } from "@/types/graphrag";
import { runGraphRag } from "@/services/graphrag/orchestrator";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "NusaKata GraphRAG API is running",
  });
}

// Endpoint POST dipakai saat user mengirim pertanyaan.
// Setelah input valid, pertanyaan akan diproses oleh orchestrator
// yang menjalankan seluruh alur GraphRAG.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = AskGraphSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Request tidak valid",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await runGraphRag(parsed.data.question);
    const payload = GraphRagResponseSchema.parse(result);

    return NextResponse.json(payload);
  } catch (error) {
    console.error("POST /api/graphrag error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Terjadi kesalahan pada server",
      },
      { status: 500 }
    );
  }
}