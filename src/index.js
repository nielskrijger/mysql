import cassandra from 'cassandra-driver';
import bluebird from 'bluebird';
import EventEmitter from 'events';

let client = null;
const eventEmitter = new EventEmitter();

/**
 * Establishes a connection to the cassandra server.
 *
 * Connect should be called at most once.
 */
export function connect(config) {
  client = new cassandra.Client(config);
  bluebird.promisifyAll(client);
}

/**
 * Adds event listener to the end of the listeners array for the event named
 * `eventName`.
 *
 * Returns a reference to the EventEmitter so calls can be chained.
 */
export function on(eventName, listener) {
  eventEmitter.on(eventName, listener);
  return eventEmitter;
}

/**
 * Executes cassandra query on active client.
 *
 * Make sure `init()` is called beforehand to establish connection.
 *
 * Returns a promise with the query result.
 */
export function execute(query, params, options) {
  if (!client) throw new Error('Must call connect(...) first');
  eventEmitter.emit('log', 'debug', 'Cassandra execute', { query, params, options });
  return client.executeAsync(query, params, options);
}

/**
 * Executes a batch of statements in Cassandra.
 *
 * This method defaults to a LOGGED BATCH with statements where prepared `statements` are formatted as follows:
 *
 * ```js
 * [{
 *   query: 'UPDATE user_profiles SET email=? WHERE key=?',
 *   params: [emailAddress, 'hendrix']
 * }]
 * ```
 */
export function batch(statements, options = {}) {
  if (!client) throw new Error('Must call connect(...) first');
  eventEmitter.emit('log', 'debug', 'Cassandra batch', { statements, options })
  return client.batchAsync(statements, options);
}

/**
 * Creates a prepared INSERT statement.
 */
export function preparedInsert(table, object, options = {}) {
  const opts = Object.assign({}, {
    notExists: false,
    ttl: null,
  }, options);
  const objectKeys = Object.keys(object);
  objectKeys.sort(); // Ensure prepared statement is always identical to improve efficiency on database server

  // Generate columns and values
  const params = [];
  let columns = '';
  let values = '';
  for (const key of objectKeys) {
    if (columns.length > 0) {
      columns += ', ';
      values += ', ';
    }
    columns += key;
    values += '?';
    params.push(object[key]);
  }
  let query = `INSERT INTO ${table} (${columns}) VALUES (${values})`;
  if (opts.notExists) query += ' IF NOT EXISTS';
  if (opts.ttl) query += ` USING TTL ${opts.ttl}`;
  return { query, params };
}

/**
 * Creates Cassandra keyspace if it not already exists.
 *
 * Will execute a `USE <keyspace>` afterwards to ensure all connections are
 * targetting the same keyspace.
 */
export function createKeyspace(keyspace, replicationClass) {
  eventEmitter.emit('log', 'info', `Creating cassandra '${keyspace}' keyspace (if not exists)`)
  // Ensure query only contains single quotes rather than double quotes (avoid JSON.stringify)
  let statement = `CREATE KEYSPACE IF NOT EXISTS ${keyspace}`;
  if (replicationClass === 'SimpleStrategy') {
    statement += ' WITH REPLICATION = {\'class\': \'SimpleStrategy\', \'replication_factor\' : 1};';
  } else {
    statement += ' WITH REPLICATION = {\'class\': \'NetworkTopologyStrategy\'};';
  }

  return execute(statement)
    .then(() => execute(`USE ${keyspace};`));
}

/**
 * Immediately and irreversible removes the application's keyspace, including
 * all tables and data contained in the keyspace.
 */
export function dropKeyspace(keyspace) {
  const query = `DROP KEYSPACE IF EXISTS ${keyspace};`;
  return execute(query);
}
