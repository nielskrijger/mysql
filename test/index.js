import { expect } from 'chai';
import * as mysql from '../src/index';

describe('MySQL', () => {
  describe('query(...)', () => {
    it('should throw error when not connected', () => {
      expect(mysql.query).to.throw(/mysql\.connect/);
    });
  });

  describe('transaction(...)', () => {
    it('should throw error when not connected', () => {
      expect(mysql.transaction).to.throw(/mysql\.connect/);
    });
  });
});
