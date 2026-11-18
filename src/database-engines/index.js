import MYSQL from "./sql/mysql.js";
import POSTGRESQL from "./sql/postgresql.js";
import SQLITE from "./sql/sqlite.js";
import MARIADB from "./sql/mariadb.js";
import MSSQL from "./sql/mssql.js";
import ORACLE from "./sql/oracle.js";
import SUPABASE from "./sql/supabase.js";
import MONGODB from "./nosql/mongodb.js";
import REDIS from "./nosql/redis.js";
import FIREBASE from "./nosql/firebase.js";
import DYNAMODB from "./nosql/dynamodb.js";
import CASSANDRA from "./nosql/cassandra.js";
import NEO4J from "./nosql/neo4j.js";

/** Ordered engine registry — add a new engine file and register it here. */
export const ENGINES = {
  mysql: MYSQL,
  postgresql: POSTGRESQL,
  sqlite: SQLITE,
  mariadb: MARIADB,
  mssql: MSSQL,
  oracle: ORACLE,
  mongodb: MONGODB,
  redis: REDIS,
  firebase: FIREBASE,
  supabase: SUPABASE,
  dynamodb: DYNAMODB,
  cassandra: CASSANDRA,
  neo4j: NEO4J,
};

export const ENGINE_LIST = Object.values(ENGINES);

export function listEngines() {
  return ENGINE_LIST;
}

export function getEngine(id) {
  return ENGINES[id] || null;
}
