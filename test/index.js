import { expect } from 'chai';
import * as cassandra from '../src/index';

describe('Cassandra', () => {
  describe('preparedInsert', () => {
    const object = {
      b: 'test',
      a: 1,
    };

    it('should order properties alphabetically', () => {
      const query = cassandra.preparedInsert('test', object, {});
      expect(query.query).to.equal('INSERT INTO test (a, b) VALUES (?, ?)');
      expect(query.params.length).to.equal(2);
      expect(query.params[0]).to.equal(1);
      expect(query.params[1]).to.equal('test');
    });

    it('should support TTL', () => {
      const query = cassandra.preparedInsert('test', object, { ttl: 1000 });
      expect(query.query).to.equal('INSERT INTO test (a, b) VALUES (?, ?) USING TTL 1000');
    });

    it('should support NOT EXISTS', () => {
      const query = cassandra.preparedInsert('test', object, { notExists: true });
      expect(query.query).to.equal('INSERT INTO test (a, b) VALUES (?, ?) IF NOT EXISTS');
    });

    it('should throw error when not connected', () => {
      expect(cassandra.batch).to.throw(/connect/);
    });
  });

  describe('execute', () => {
    it('should throw error when not connected', () => {
      expect(cassandra.execute).to.throw(/connect/);
    });
  });
});
