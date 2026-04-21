/**
 * Tahap: Graph Building Utility
 * Peran: Mengubah records menjadi node dan edge untuk Cytoscape.
 * Input: Intent dan records hasil query.
 * Output: Struktur graph yang siap divisualisasikan.
 *
 * Penjelasan:
 * File ini berisi logic pembentukan graph visual.
 * Bentuk graph yang dihasilkan bisa berbeda tergantung intent,
 * misalnya:
 * - word -> language,
 * - word -> root form -> language,
 * - atau word -> root form.
 *
 * Untuk beberapa kasus, file ini juga membuat inferensi visual
 * agar relasi etimologi lebih mudah dipahami saat ditampilkan.
 */
import {
  GraphElements,
  GraphIntent,
  GenericRecord,
  GraphElementsSchema,
} from "@/types/graphrag";

// Fungsi ini mengubah records hasil query menjadi graph.
// Bentuk graph berbeda tergantung intent:
// - origin_of_word,
// - words_by_language,
// - root_of_word.
function makeNode(id: string, label: string, type: string) {
  return {
    data: {
      id,
      label,
      type,
    },
  };
}

function makeEdge(id: string, source: string, target: string, label: string) {
  return {
    data: {
      id,
      source,
      target,
      label,
    },
  };
}

function isSameForm(a?: string, b?: string) {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

export function buildGraphFromRecords(
  intent: GraphIntent,
  records: GenericRecord[]
): GraphElements {
  const nodesMap = new Map<string, ReturnType<typeof makeNode>>();
  const edgesMap = new Map<string, ReturnType<typeof makeEdge>>();

  if (intent === "origin_of_word") {
    records.forEach((record, index) => {
      const word = record.word;
      const rootForm = record.root_form;
      const language = record.origin_language;

      if (!word) return;

      const wordId = `word:${word}`;
      nodesMap.set(wordId, makeNode(wordId, word, "Word"));

      const hasDistinctRoot = rootForm && !isSameForm(word, rootForm);

      if (hasDistinctRoot) {
        const rootId = `root:${rootForm}`;
        nodesMap.set(rootId, makeNode(rootId, rootForm!, "RootForm"));

        const derivedEdgeId = `edge:derived:${word}:${rootForm}:${index}`;
        edgesMap.set(
          derivedEdgeId,
          makeEdge(derivedEdgeId, wordId, rootId, "DERIVED_FROM")
        );

        if (language) {
          const languageId = `language:${language}`;
          nodesMap.set(languageId, makeNode(languageId, language, "Language"));

          const originEdgeId = `edge:origin:${rootForm}:${language}:${index}`;
          edgesMap.set(
            originEdgeId,
            makeEdge(originEdgeId, rootId, languageId, "ORIGIN_LANGUAGE")
          );
        }
      } else if (language) {
        const languageId = `language:${language}`;
        nodesMap.set(languageId, makeNode(languageId, language, "Language"));

        const edgeId = `edge:origin:${word}:${language}:${index}`;
        edgesMap.set(
          edgeId,
          makeEdge(edgeId, wordId, languageId, "ORIGIN_LANGUAGE")
        );
      }
    });
  }

  if (intent === "words_by_language") {
    records.forEach((record, index) => {
      const word = record.word;
      const rootForm = record.root_form;
      const language = record.origin_language;

      if (!word || !language) return;

      const wordId = `word:${word}`;
      const languageId = `language:${language}`;

      nodesMap.set(wordId, makeNode(wordId, word, "Word"));
      nodesMap.set(languageId, makeNode(languageId, language, "Language"));

      const hasDistinctRoot = rootForm && !isSameForm(word, rootForm);

      if (hasDistinctRoot) {
        const rootId = `root:${rootForm}`;
        nodesMap.set(rootId, makeNode(rootId, rootForm!, "RootForm"));

        const derivedEdgeId = `edge:derived:${word}:${rootForm}:${index}`;
        const originEdgeId = `edge:origin:${rootForm}:${language}:${index}`;

        edgesMap.set(
          derivedEdgeId,
          makeEdge(derivedEdgeId, wordId, rootId, "DERIVED_FROM")
        );
        edgesMap.set(
          originEdgeId,
          makeEdge(originEdgeId, rootId, languageId, "ORIGIN_LANGUAGE")
        );
      } else {
        const edgeId = `edge:origin:${word}:${language}:${index}`;
        edgesMap.set(
          edgeId,
          makeEdge(edgeId, wordId, languageId, "ORIGIN_LANGUAGE")
        );
      }
    });
  }

  if (intent === "root_of_word") {
    records.forEach((record, index) => {
      const word = record.word;
      const rootForm = record.root_form;

      if (!word || !rootForm) return;

      const wordId = `word:${word}`;
      const rootId = `root:${rootForm}`;
      const edgeId = `edge:root:${word}:${rootForm}:${index}`;

      nodesMap.set(wordId, makeNode(wordId, word, "Word"));
      nodesMap.set(rootId, makeNode(rootId, rootForm, "RootForm"));
      edgesMap.set(edgeId, makeEdge(edgeId, wordId, rootId, "DERIVED_FROM"));
    });
  }

  return GraphElementsSchema.parse({
    nodes: Array.from(nodesMap.values()),
    edges: Array.from(edgesMap.values()),
  });
}