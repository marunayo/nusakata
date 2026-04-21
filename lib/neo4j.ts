import neo4j, { Driver } from "neo4j-driver";

declare global {
  // eslint-disable-next-line no-var
  var __neo4jDriver__: Driver | undefined;
}

const uri = process.env.NEO4J_URI;
const username = process.env.NEO4J_USERNAME;
const password = process.env.NEO4J_PASSWORD;

if (!uri || !username || !password) {
  throw new Error("Neo4j environment variables are missing.");
}

const driver =
  global.__neo4jDriver__ ??
  neo4j.driver(uri, neo4j.auth.basic(username, password));

if (process.env.NODE_ENV !== "production") {
  global.__neo4jDriver__ = driver;
}

export default driver;