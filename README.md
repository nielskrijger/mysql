# Cassandra

A set of convenience methods for [nodejs-cassandra](https://github.com/datastax/nodejs-driver).

**NOTE**: this library is not very customizable nor will it be, its intent is to serve as a standard for my personal projects. There are only few tests because its use is extensively tested in component tests.

## Connect

Run `connect(...)` before executing any statements.

```js
cassandra.connect({
  contactPoints: ['h1', 'h2'],
  keyspace: 'ks1',
});
```

Available options are all cassandra-driver [ClientOptions](http://docs.datastax.com/en/drivers/nodejs/3.0/global.html#ClientOptions).

## Create/drop keyspace

```js
cassandra.createKeyspace('test', 'NetworkTopologyStrategy')
  .then(() => console.log('Keyspace "test" created'));
```

```js
cassandra.dropKeyspace('test')
  .then(() => console.log('Keyspace "test" created'));
```

## Execute

```js
cassandra.execute(`SELECT * FROM users WHERE id=?`, ['a813g1e'], { prepare: true })
  .then((result) => console.log('Result', result));
```

## Prepared insert

Create a prepared INSERT statement based on an object.

You can use this for update statements as well because Cassandra's INSERT and UPDATE are almost identical with the exception of counter columns.

```js
const query = cassandra.preparedInsert('users', {
  id: 'a7509gd',
  first_name: 'John',
  last_name: 'Doe',
}, { ttl: 3600 * 24 * 31, notExists: true });

/*
{
  query: 'INSERT INTO users (first_name, id, last_name) VALUES (?, ?, ?) IF NOT EXISTS USING TTL 2678400',
  params: [ 'John', 'a7509gd', 'Doe' ]
}
*/
console.log(query);
```

Option    | Default | Description
----------|---------|------------------
notExists | `false` | Adds IF NOT EXISTS clause to prepared query
ttl       | `null`  | umber of seconds after which record is deleted. Set `null` to never expire data.

## Batch execute

Batch method is a minimal wrapper around [nodejs-cassandra](https://github.com/datastax/nodejs-driver)'s `batch` statement. It returns a promise with the result of the BATCH operation.

```js
const queries = [{
  query: 'UPDATE users SET name=? WHERE id=?',
  params: ['John', 'ae835x'],
}, {
  query: 'INSERT INTO users (id, name, created) VALUES (?, ?, ?)',
  params: ['1g0fee', 'hendrix', new Date()],
}];

cassandra.batch(queries, { prepare: true }).catch(err => {
  assert.ifError(err);
  console.log('Data updated on cluster');
});
```

The most common options are listed below, you can find more [here](http://docs.datastax.com/en/drivers/nodejs/3.0/global.html#QueryOptions).

Option    | Default | Description
----------|---------|-----------------------------
prepare   | `false` | Queries are prepared statements.
logged    | `true`  | Whether batch should be written to the batchlog.

Be aware batch in Cassandra is not a performance improvement in most cases, rather it provided atomic transactions; either all operations succeed or none.

The one exception an unlogged batch provides performance benefits is when a set of writes are written to the same partition.

## Logging

```js
import * as cassandra from '@nielskrijger/cassandra';

cassandra.on('log', (level, message, object) => {
  console.log(`Log event: ${level}, ${message}, ${object}`);
});
```

A `debug` log event is emitted when executing a statement or a batch of statements. An `info` log event is emitted when connection was established.

Errors must be handled by the client as part of the Promise chain, no log events are emitted.
