export const GRAPH_SCHEMA_TEXT = `
Node labels:
- Word { lemma, meaning }
- Language { name, family }
- RootForm { form, gloss }

Relationships:
- (:Word)-[:ORIGIN_LANGUAGE]->(:Language)
- (:Word)-[:DERIVED_FROM]->(:RootForm)
- (:Word)-[:BORROWED_FROM]->(:Word)
`.trim();