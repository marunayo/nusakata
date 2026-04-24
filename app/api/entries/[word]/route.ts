import { NextRequest, NextResponse } from "next/server";
import driver from "@/lib/neo4j";
import { EtymologyEntrySchema } from "@/types/entry";

/**
 * Tahap: Single Entry API
 * Peran: Menangani update dan delete untuk satu entri etimologi.
 * Input: Parameter word pada URL dan payload request.
 * Output: Response JSON hasil update atau delete.
 */

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ word: string }> }
) {
  const session = driver.session();

  try {
    const { word: currentWord } = await context.params;
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
      MATCH (w:Word {lemma: $currentWord})
      OPTIONAL MATCH (w)-[d:DERIVED_FROM]->(:RootForm)
      OPTIONAL MATCH (w)-[o:ORIGIN_LANGUAGE]->(:Language)
      DELETE d, o

      SET w.lemma = $word,
          w.meaning = $meaning

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

    const result = await session.run(cypher, {
      currentWord,
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
    const { word } = await context.params;

    const cypher = `
      MATCH (w:Word {lemma: $word})
      OPTIONAL MATCH (w)-[d:DERIVED_FROM]->(:RootForm)
      OPTIONAL MATCH (w)-[o:ORIGIN_LANGUAGE]->(:Language)
      DELETE d, o
      DELETE w
    `;

    await session.run(cypher, { word });

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