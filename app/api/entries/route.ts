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

function buildRootRelationMergeCypher(relationType: string) {
  switch (relationType) {
    case "BORROWED_FROM":
      return `MERGE (w)-[:BORROWED_FROM]->(r)`;
    case "COGNATE_WITH":
      return `MERGE (w)-[:COGNATE_WITH]->(r)`;
    case "DERIVED_FROM":
    default:
      return `MERGE (w)-[:DERIVED_FROM]->(r)`;
  }
}

export async function GET() {
  const session = driver.session();

  try {
    const cypher = `
      MATCH (w:Word)
      OPTIONAL MATCH (w)-[rel]->(r:RootForm)
      OPTIONAL MATCH (w)-[:ORIGIN_LANGUAGE]->(l:Language)
      RETURN
        w.lemma AS lemma,
        w.meaning AS meaning,
        r.form AS rootForm,
        l.name AS originLanguage,
        type(rel) AS relationType,
        r.gloss AS gloss,
        l.family AS languageFamily,
        w.historicalPeriod AS historicalPeriod,
        w.notes AS notes,
        w.sourceReference AS sourceReference
      ORDER BY w.lemma
    `;

    const result = await session.run(cypher);

    const data = result.records.map((record) =>
      EtymologyEntrySchema.parse({
        lemma: String(record.get("lemma") ?? ""),
        meaning: String(record.get("meaning") ?? ""),
        rootForm: String(record.get("rootForm") ?? ""),
        originLanguage: String(record.get("originLanguage") ?? ""),
        relationType: String(record.get("relationType") ?? "DERIVED_FROM"),
        gloss: String(record.get("gloss") ?? ""),
        languageFamily: String(record.get("languageFamily") ?? ""),
        historicalPeriod: String(record.get("historicalPeriod") ?? ""),
        notes: String(record.get("notes") ?? ""),
        sourceReference: String(record.get("sourceReference") ?? ""),
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
    const relationMergeCypher = buildRootRelationMergeCypher(entry.relationType);

    const cypher = `
      MERGE (w:Word {lemma: $lemma})
      SET
        w.meaning = $meaning,
        w.historicalPeriod = $historicalPeriod,
        w.notes = $notes,
        w.sourceReference = $sourceReference

      MERGE (r:RootForm {form: $rootForm})
      SET r.gloss = $gloss

      MERGE (l:Language {name: $originLanguage})
      SET l.family = $languageFamily

      ${relationMergeCypher}
      MERGE (w)-[:ORIGIN_LANGUAGE]->(l)

      RETURN
        w.lemma AS lemma,
        w.meaning AS meaning,
        r.form AS rootForm,
        l.name AS originLanguage,
        $relationType AS relationType,
        r.gloss AS gloss,
        l.family AS languageFamily,
        w.historicalPeriod AS historicalPeriod,
        w.notes AS notes,
        w.sourceReference AS sourceReference
    `;

    const result = await session.run(cypher, entry);
    const record = result.records[0];

    const data = [
      EtymologyEntrySchema.parse({
        lemma: String(record.get("lemma") ?? ""),
        meaning: String(record.get("meaning") ?? ""),
        rootForm: String(record.get("rootForm") ?? ""),
        originLanguage: String(record.get("originLanguage") ?? ""),
        relationType: String(record.get("relationType") ?? "DERIVED_FROM"),
        gloss: String(record.get("gloss") ?? ""),
        languageFamily: String(record.get("languageFamily") ?? ""),
        historicalPeriod: String(record.get("historicalPeriod") ?? ""),
        notes: String(record.get("notes") ?? ""),
        sourceReference: String(record.get("sourceReference") ?? ""),
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