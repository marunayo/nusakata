import { NextRequest, NextResponse } from "next/server";
import driver from "@/lib/neo4j";
import { EtymologyEntrySchema } from "@/types/entry";

/**
 * Tahap: Single Entry API
 * Peran: Menangani update dan delete untuk satu entri etimologi.
 * Input: Parameter lemma pada URL dan payload request.
 * Output: Response JSON hasil update atau delete.
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

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ word: string }> }
) {
  const session = driver.session();

  try {
    const { word: currentLemma } = await context.params;
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
      MATCH (w:Word {lemma: $currentLemma})
      OPTIONAL MATCH (w)-[relToRoot]->(:RootForm)
      OPTIONAL MATCH (w)-[relToLang:ORIGIN_LANGUAGE]->(:Language)
      DELETE relToRoot, relToLang

      SET
        w.lemma = $lemma,
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
        w.lemma AS lemma
    `;

    const result = await session.run(cypher, {
      currentLemma,
      ...entry,
    });

    if (result.records.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "Entri tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Entri berhasil diperbarui.",
    });
  } catch (error) {
    console.error("PUT /api/entries/[word] error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Gagal memperbarui entri.",
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ word: string }> }
) {
  const session = driver.session();

  try {
    const { word: lemma } = await context.params;

    const cypher = `
      MATCH (w:Word {lemma: $lemma})
      OPTIONAL MATCH (w)-[relToRoot]->(:RootForm)
      OPTIONAL MATCH (w)-[relToLang:ORIGIN_LANGUAGE]->(:Language)
      DELETE relToRoot, relToLang
      DELETE w
    `;

    await session.run(cypher, { lemma });

    return NextResponse.json({
      ok: true,
      message: "Entri berhasil dihapus.",
    });
  } catch (error) {
    console.error("DELETE /api/entries/[word] error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Gagal menghapus entri.",
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}