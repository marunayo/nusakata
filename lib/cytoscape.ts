import {
  GraphElements,
  GraphIntent,
  GenericRecord,
  GraphElementsSchema,
} from "@/types/graphrag";

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

export function buildGraphFromRecords(
  intent: GraphIntent,
  records: GenericRecord[]
): GraphElements {
  const nodesMap = new Map<string, ReturnType<typeof makeNode>>();
  const edgesMap = new Map<string, ReturnType<typeof makeEdge>>();

  if (intent === "origin_of_word" || intent === "words_by_language") {
    records.forEach((record, index) => {
      const word = record.word;
      const language = record.origin_language;

      if (!word || !language) return;

      const wordId = `word:${word}`;
      const languageId = `language:${language}`;
      const edgeId = `edge:origin:${word}:${language}:${index}`;

      nodesMap.set(wordId, makeNode(wordId, word, "Word"));
      nodesMap.set(languageId, makeNode(languageId, language, "Language"));
      edgesMap.set(
        edgeId,
        makeEdge(edgeId, wordId, languageId, "ORIGIN_LANGUAGE")
      );
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