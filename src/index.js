/* eslint-disable prefer-rest-params */
import mysql from 'mysql';
import moment from 'moment';

let pool = null;

/**
 * Creates a connection pool to the mysql server.
 *
 * Connect should be called at most once.
 */
export function connect(options) {
  pool = mysql.createPool(options);
}

/**
 * Returns the current timestamp in UTC as a MySQL string.
 */
export function now() {
  return moment.utc().format('YYYY-MM-DD HH:mm:ss.SSS');
}

/**
 * Returns a new object with all properties in `row` that start with specified
 * `prefix`. The returned object strips the prefix from its properties.
 */
export function pickWithPrefix(row, prefix) {
  const result = {};
  Object.keys(row).forEach(prop => {
    if (prop.startsWith(prefix)) {
      result[prop.substring(prefix.length)] = row[prop];
    }
  });
  return result;
}

/**
 * Returns a new object with all properties in `row` that do not start with
 * specified `prefix`.
 */
export function pickWithoutPrefix(row, prefix) {
  const result = {};
  Object.keys(row).forEach(prop => {
    if (!prop.startsWith(prefix)) {
      result[prop] = row[prop];
    }
  });
  return result;
}

/**
 * Executes a query and automatically releases connection when done.
 */
export function query() {
  if (!pool) throw new Error('Must first call mysql.connect(...)');

  return new Promise((resolve, reject) => {
    pool.getConnection((err, conn) => {
      if (err) return reject(err);
      const args = Array.from(arguments);

      // Add callback method to process query result and release connection
      args.push((err2, rows) => {
        conn.release(); // Always release connection regardless what happens
        if (err2) return reject(err2);

        return resolve(rows);
      });
      return conn.query(...args);
    });
  });
}

/**
 * Executes a bunch of queries atomically (all or nothing).
 */
export function transaction(queries) {
  if (!pool) throw new Error('Must first call mysql.connect(...)');

  return new Promise((resolveTransaction, rejectTransaction) => {
    pool.getConnection((err, conn) => {
      if (err) return rejectTransaction(err);
      return conn.beginTransaction(err2 => {
        if (err2) return rejectTransaction(err);

        // Executes a query, returns a promise.
        function executeQuery() {
          return new Promise((resolve, reject) => {
            const args = Array.from(arguments);

            // Add callback method to process query result and release connection
            args.push((err3, rows) => {
              if (err3) return reject(err3);
              return resolve(rows);
            });
            conn.query(...args);
          });
        }

        // Execute queries in sequence, MySQL protocol does not support parallel queries
        const querySequence = queries.reduce((promise, statement) => {
          return promise.then(() => executeQuery(statement.query, statement.params));
        }, Promise.resolve());
        return querySequence.then(() => {
          conn.commit(err3 => {
            if (err3) throw err3;
            conn.release();
            return resolveTransaction();
          });
        }).catch(err4 => {
          conn.rollback(() => {
            conn.release();
            return rejectTransaction(err4);
          });
        });
      });
    });
  });
}

/**
 * Gracefully ends all connections.
 */
export function cleanup() {
  if (pool !== null) {
    pool.end(err => {
      if (err) {
        throw new Error('Failed closing pool connections gracefully', err);
      }
    });
  }
}

// Cleanup when app is closing
process.on('exit', cleanup);

// Catches ctrl+c event
process.on('SIGINT', cleanup);

// We do not clean up when UncaughtException is found
