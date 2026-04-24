import { NextRequest, NextResponse } from "next/server";
import driver from "@/lib/neo4j";
import {
  EtymologyEntrySchema,
  EtymologyEntryResponseSchema,
} from "@/types/entry";

/**
 * Tahap: Entries Collection API
 * Peran: Menangani operasi baca semua entri dan tambah entri baru.
 * Input: Request GET atau POST.
 * Output: Response JSON berisi daftar entri atau hasil penambahan data.
 */

export async function GET() {
  const session = driver.session();

  try {
    const cypher = `
      MATCH (w:Word)
      OPTIONAL MATCH (w)-[:DERIVED_FROM]->(r:RootForm)
      OPTIONAL MATCH (w)-[:ORIGIN_LANGUAGE]->(l:Language)
      RETURN
        w.lemma AS word,
        w.meaning AS meaning,
        r.form AS rootForm,
        r.gloss AS gloss,
        l.name AS originLanguage,
        l.family AS languageFamily
      ORDER BY w.lemma
    `;

    const result = await session.run(cypher);

    const data = result.records.map((record) =>
      EtymologyEntrySchema.parse({
        word: String(record.get("word") ?? ""),
        meaning: String(record.get("meaning") ?? ""),
        rootForm: String(record.get("rootForm") ?? ""),
        gloss: String(record.get("gloss") ?? ""),
        originLanguage: String(record.get("originLanguage") ?? ""),
        languageFamily: String(record.get("languageFamily") ?? ""),
      })
    );

    const payload = EtymologyEntryResponseSchema.parse({
      ok: true,
      data,
      message: "Daftar entri berhasil diambil.",
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error("GET /api/entries error:", error);

    return NextResponse.json(
      {
        ok: false,
        data: [],
        message: "Gagal mengambil data entri.",
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

export async function POST(req: NextRequest) {
  const session = driver.session();

  try {
    const body = await req.json();
    const parsed = EtymologyEntrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: "Payload tidak valid.",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const entry = parsed.data;

    const cypher = `
      MERGE (w:Word {lemma: $word})
      SET w.meaning = $meaning

      MERGE (r:RootForm {form: $rootForm})
      SET r.gloss = $gloss

      MERGE (l:Language {name: $originLanguage})
      SET l.family = $languageFamily

      MERGE (w)-[:DERIVED_FROM]->(r)
      MERGE (w)-[:ORIGIN_LANGUAGE]->(l)

      RETURN
        w.lemma AS word,
        w.meaning AS meaning,
        r.form AS rootForm,
        r.gloss AS gloss,
        l.name AS originLanguage,
        l.family AS languageFamily
    `;

    const result = await session.run(cypher, entry);
    const record = result.records[0];

    const data = [
      EtymologyEntrySchema.parse({
        word: String(record.get("word") ?? ""),
        meaning: String(record.get("meaning") ?? ""),
        rootForm: String(record.get("rootForm") ?? ""),
        gloss: String(record.get("gloss") ?? ""),
        originLanguage: String(record.get("originLanguage") ?? ""),
        languageFamily: String(record.get("languageFamily") ?? ""),
      }),
    ];

    return NextResponse.json({
      ok: true,
      data,
      message: "Entri berhasil ditambahkan.",
    });
  } catch (error) {
    console.error("POST /api/entries error:", error);

    return NextResponse.json(
      {
        ok: false,
        data: [],
        message: "Gagal menambahkan entri.",
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}