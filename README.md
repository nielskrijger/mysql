# Mysql

A wrapper for the [Node.js mysql](https://github.com/mysqljs/mysql) library, providing promises and a set of convenience methods.

**NOTE**: this library is not very customizable nor will it be, its intent is to serve as a standard for my personal projects. There are only few tests because its use is extensively tested in other projects.

## connect(...)

Connect creates a connection pool to the MySQL server and must be called before any other commands.

Connect simply passes the specified connection options to [mysql.createPool()](https://github.com/mysqljs/mysql#pooling-connections).

```js
import { connect } from '@nielskrijger/mysql';

connect({
  connectionLimit: 10,
  host: '127.0.0.1',
  user: 'root',
  password: 'root',
  database: 'my_database',
});
```

## query(...)

Executes a query and automatically releases connection when done.

```js
import { QueryOptions } from '@nielskrijger/mysql';

const sql = 'SELECT * FROM users WHERE id = ?';
query(sql, ['1g0fee'])
  .then(result => {
    console.log(result);
  });
```

## transaction(...)

Executes a bunch of queries atomically (all or nothing).

The transaction is committed automatically when all queries succeeded or rolled back if any failed.

Example:

```js
import { transaction } from '@nielskrijger/mysql';

const queries = [{
  query: 'INSERT INTO users (id, name, created) VALUES (?, ?, ?)',
  params: ['1g0fee', 'hendrix', new Date()],
}, {
  query: 'INSERT INTO emails (user_id, email) VALUES (?, ?)',
  params: ['1g0fee', 'johndoe@example.com'],
}];

transaction(queries)
  .then(results => {
    console.log(results);
  })
  .catch(err => {
    console.err('Error occured, transaction was rolled back', err);
  });
```

## now()

Returns the current timestamp in a MySQL date format ('YYYY-MM-DD HH:mm:ss.SSS').

## pickWithPrefix(...) and pickWithoutPrefix(...)

When joining tables often you'll find columns have the same name and only one of them is returned. To prevent this a pattern I've adopted is aliasing all columns of one table with a prefix. `pickWithPrefix(...)` and `pickWithoutPrefix(...)` are helpers methods to parse such a result.

While this may be cumbersome, I've preferred it over ORMs in smaller projects.

Example:

```js
import {
  query,
  pickWithPrefix,
  pickWithoutPrefix,
} from '@nielskrijger/mysql';

const sql = `
  SELECT a.name AS a_name, b.*
  FROM users a
  INNER JOIN groups g ON a.id = b.user_id
  WHERE a.id = ?`;
query(sql, ['1g0fee'])
  .then(rows => {
    return Object.assign(
      pickWithPrefix(rows[0], 'a_'),
      groups: rows.map(pickWithoutPrefix),
    );
  });
```
