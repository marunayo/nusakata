import { GenericRecord, GraphIntent } from "@/types/graphrag";

/**
 * Tahap: Graph Building Utility
 * Peran: Mengubah records hasil query menjadi node dan edge untuk Cytoscape.
 * Input: intent GraphRAG dan records hasil query.
 * Output: payload graph berisi nodes dan edges.
 */

export type CytoscapeNode = {
  data: {
    id: string;
    label: string;
    type: "word" | "root_form" | "language";
  };
};

export type CytoscapeEdge = {
  data: {
    id: string;
    source: string;
    target: string;
    label: string;
  };
};

type GraphPayload = {
  nodes: CytoscapeNode[];
  edges: CytoscapeEdge[];
};

function safeId(prefix: string, value: string) {
  return `${prefix}:${value}`;
}

function relationLabel(type?: string) {
  switch (type) {
    case "BORROWED_FROM":
      return "BORROWED_FROM";
    case "COGNATE_WITH":
      return "COGNATE_WITH";
    case "DERIVED_FROM":
    default:
      return "DERIVED_FROM";
  }
}

function addNode(
  nodeMap: Map<string, CytoscapeNode>,
  id: string,
  label: string,
  type: CytoscapeNode["data"]["type"]
) {
  if (!nodeMap.has(id)) {
    nodeMap.set(id, {
      data: {
        id,
        label,
        type,
      },
    });
  }
}

function addEdge(
  edgeMap: Map<string, CytoscapeEdge>,
  source: string,
  target: string,
  label: string
) {
  const id = `${source}->${target}:${label}`;

  if (!edgeMap.has(id)) {
    edgeMap.set(id, {
      data: {
        id,
        source,
        target,
        label,
      },
    });
  }
}

function buildOriginOfWordGraph(records: GenericRecord[]): GraphPayload {
  const nodeMap = new Map<string, CytoscapeNode>();
  const edgeMap = new Map<string, CytoscapeEdge>();

  for (const record of records) {
    const word = record.word;
    const rootForm = record.root_form;
    const language = record.origin_language;
    const relationType = relationLabel(record.relation_type);

    if (!word) continue;

    const wordId = safeId("word", word);
    addNode(nodeMap, wordId, word, "word");

    if (rootForm && rootForm.toLowerCase() !== word.toLowerCase()) {
      const rootId = safeId("root", rootForm);
      addNode(nodeMap, rootId, rootForm, "root_form");
      addEdge(edgeMap, wordId, rootId, relationType);

      if (language) {
        const languageId = safeId("language", language);
        addNode(nodeMap, languageId, language, "language");
        addEdge(edgeMap, rootId, languageId, "ORIGIN_LANGUAGE");
      }
    } else if (language) {
      const languageId = safeId("language", language);
      addNode(nodeMap, languageId, language, "language");
      addEdge(edgeMap, wordId, languageId, "ORIGIN_LANGUAGE");
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
  };
}

function buildWordsByLanguageGraph(records: GenericRecord[]): GraphPayload {
  const nodeMap = new Map<string, CytoscapeNode>();
  const edgeMap = new Map<string, CytoscapeEdge>();

  for (const record of records) {
    const word = record.word;
    const rootForm = record.root_form;
    const language = record.origin_language;
    const relationType = relationLabel(record.relation_type);

    if (!word || !language) continue;

    const wordId = safeId("word", word);
    const languageId = safeId("language", language);

    addNode(nodeMap, wordId, word, "word");
    addNode(nodeMap, languageId, language, "language");

    if (rootForm && rootForm.toLowerCase() !== word.toLowerCase()) {
      const rootId = safeId("root", rootForm);
      addNode(nodeMap, rootId, rootForm, "root_form");
      addEdge(edgeMap, wordId, rootId, relationType);
      addEdge(edgeMap, rootId, languageId, "ORIGIN_LANGUAGE");
    } else {
      addEdge(edgeMap, wordId, languageId, "ORIGIN_LANGUAGE");
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
  };
}

function buildRootOfWordGraph(records: GenericRecord[]): GraphPayload {
  const nodeMap = new Map<string, CytoscapeNode>();
  const edgeMap = new Map<string, CytoscapeEdge>();

  for (const record of records) {
    const word = record.word;
    const rootForm = record.root_form;
    const relationType = relationLabel(record.relation_type);

    if (!word || !rootForm) continue;

    const wordId = safeId("word", word);
    addNode(nodeMap, wordId, word, "word");

    if (rootForm.toLowerCase() === word.toLowerCase()) {
      continue;
    }

    const rootId = safeId("root", rootForm);
    addNode(nodeMap, rootId, rootForm, "root_form");
    addEdge(edgeMap, wordId, rootId, relationType);
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
  };
}

/**
 * Fungsi utama pembentuk graph.
 * Sistem memilih strategi pembentukan graph berdasarkan intent.
 */
export function buildGraphFromRecords(
  intent: GraphIntent,
  records: GenericRecord[]
): GraphPayload {
  if (!records || records.length === 0) {
    return {
      nodes: [],
      edges: [],
    };
  }

  switch (intent) {
    case "origin_of_word":
      return buildOriginOfWordGraph(records);

    case "words_by_language":
      return buildWordsByLanguageGraph(records);

    case "root_of_word":
      return buildRootOfWordGraph(records);

    default:
      return {
        nodes: [],
        edges: [],
      };
  }
}